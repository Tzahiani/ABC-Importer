import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  convertAbcString,
  countTunes,
  parsePreviewOnly,
  type ConvertResult,
  type AbcPreview,
} from "./conversion";
import { useI18n } from "./i18n";
import "./App.css";

const HISTORY_KEY = "abc-muse-app-history-v1";
const MAX_HISTORY = 12;

type HistoryEntry = {
  id: string;
  label: string;
  at: string;
  snippet: string;
};

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const v = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function pushHistory(entry: Omit<HistoryEntry, "at"> & { at?: string }) {
  const list = loadHistory();
  const next: HistoryEntry = {
    ...entry,
    at: entry.at ?? new Date().toISOString(),
  };
  const filtered = list.filter((x) => x.id !== next.id);
  const merged = [next, ...filtered].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
}

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function triggerDownload(data: BlobPart, filename: string, mime: string) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const { locale, t, ti, toggleLocale } = useI18n();
  const [tab, setTab] = useState<"drop" | "paste" | "batch">("drop");
  const [abcText, setAbcText] = useState("");
  const [tuneIndex, setTuneIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [highlightLine, setHighlightLine] = useState<number | undefined>();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [uiError, setUiError] = useState<string | null>(null);
  const [uiInfo, setUiInfo] = useState<string | null>(null);

  const dateLocale = locale === "he" ? "he-IL" : "en-US";

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const tuneCount = useMemo(() => countTunes(abcText), [abcText]);

  const livePreview = useMemo(
    () => parsePreviewOnly(abcText, tuneIndex),
    [abcText, tuneIndex],
  );

  const runConvert = useCallback(async () => {
    setLoading(true);
    setHighlightLine(undefined);
    setUiError(null);
    setUiInfo(null);
    try {
      const r = convertAbcString(abcText, tuneIndex);
      setResult(r);
      const line = r.messages
        .map((m) => {
          const x = m.match(/(?:שורה|line)\s*[:]?\s*(\d+)/i);
          return x ? parseInt(x[1], 10) : undefined;
        })
        .find((n) => n !== undefined);
      if (line) setHighlightLine(line);
      if (r.success && r.preview?.title) {
        pushHistory({
          id: crypto.randomUUID(),
          label: r.preview.title,
          snippet: abcText.slice(0, 500),
        });
        setHistory(loadHistory());
      }
    } finally {
      setLoading(false);
    }
  }, [abcText, tuneIndex]);

  const saveXml = async () => {
    if (!result?.musicXml) return;
    setUiError(null);
    setUiInfo(null);
    try {
      if (!isTauri()) {
        triggerDownload(result.musicXml, "piece.musicxml", "application/vnd.recordare.musicxml+xml");
        return;
      }
      const path = await save({
        defaultPath: "piece.musicxml",
        filters: [{ name: "MusicXML", extensions: ["musicxml", "xml"] }],
      });
      if (!path || Array.isArray(path)) return;
      await invoke("save_text_file", { path, contents: result.musicXml });
      pushHistory({
        id: crypto.randomUUID(),
        label: `${result.preview?.title ?? "export"}.musicxml`,
        snippet: abcText.slice(0, 200),
      });
      setHistory(loadHistory());
    } catch (e) {
      setUiError(ti("saveXmlFailed", { e: errText(e) }));
    }
  };

  const saveMidiBinary = async () => {
    if (!result?.midiBytes) return;
    setUiError(null);
    setUiInfo(null);
    try {
      if (!isTauri()) {
        triggerDownload(result.midiBytes, "piece.mid", "audio/midi");
        return;
      }
      const path = await save({
        defaultPath: "piece.mid",
        filters: [{ name: "MIDI", extensions: ["mid", "midi"] }],
      });
      if (!path || Array.isArray(path)) return;
      await invoke("save_binary_file", {
        path,
        bytes: Array.from(result.midiBytes),
      });
    } catch (e) {
      setUiError(ti("saveMidiFailed", { e: errText(e) }));
    }
  };

  const openInMuseScore = async () => {
    if (!result?.musicXml) return;
    setUiError(null);
    setUiInfo(null);
    try {
      if (!isTauri()) {
        triggerDownload(
          result.musicXml,
          "open-in-musescore.musicxml",
          "application/vnd.recordare.musicxml+xml",
        );
        setUiInfo(t("browserMuseHint"));
        return;
      }
      const tmp = await save({
        defaultPath: "temp_open.musicxml",
        filters: [{ name: "MusicXML", extensions: ["musicxml"] }],
      });
      if (!tmp || Array.isArray(tmp)) return;
      await invoke("save_text_file", { path: tmp, contents: result.musicXml });
      const found = await invoke<{ path?: string | null }>("find_musescore");
      if (found.path) {
        await invoke("open_file_with_app", { appPath: found.path, filePath: tmp });
      } else {
        await invoke("open_path_default", { path: tmp });
      }
    } catch (e) {
      setUiError(ti("openMuseFailed", { e: errText(e) }));
    }
  };

  const pickAbcFile = async () => {
    const sel = await open({
      multiple: false,
      filters: [{ name: "ABC", extensions: ["abc", "txt", "abcd"] }],
    });
    if (!sel || Array.isArray(sel)) return;
    const text = await invoke<string>("read_text_file", { path: sel });
    setAbcText(text);
    setResult(null);
  };

  const batchConvert = async () => {
    const sel = await open({
      multiple: true,
      filters: [{ name: "ABC", extensions: ["abc", "txt"] }],
    });
    if (!sel || !sel.length) return;
    setLoading(true);
    const lines: string[] = [];
    try {
      for (const path of sel) {
        const text = await invoke<string>("read_text_file", { path });
        const r = convertAbcString(text, 0);
        if (r.musicXml) {
          const base = path.replace(/\.[^/.]+$/, "");
          const out = `${base}.musicxml`;
          await invoke("save_text_file", { path: out, contents: r.musicXml });
          lines.push(ti("batchSaved", { path: out }));
        } else {
          lines.push(ti("batchNotConverted", { path }));
        }
      }
      setResult({
        success: lines.length > 0,
        messages: lines,
      });
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAbcText(String(reader.result ?? ""));
      setResult(null);
    };
    reader.readAsText(f);
  };

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-top">
          <h1 className="hero-logo-heading">
            <img
              className="hero-logo"
              src="/brand/ABC-NoteMate_clear.png"
              alt="ABC NoteMate"
              decoding="async"
            />
          </h1>
          <button
            type="button"
            className="lang-btn"
            onClick={toggleLocale}
            aria-label={locale === "he" ? t("langSwitchToEnAria") : t("langSwitchToHeAria")}
          >
            {locale === "he" ? t("langToEn") : t("langToHe")}
          </button>
        </div>
        <p className="subtitle">{t("heroSubtitle")}</p>
      </header>

      <nav className="tabs" aria-label={t("tabsAria")}>
        <button type="button" className={tab === "drop" ? "on" : ""} onClick={() => setTab("drop")}>
          {t("tabDrop")}
        </button>
        <button type="button" className={tab === "paste" ? "on" : ""} onClick={() => setTab("paste")}>
          {t("tabPaste")}
        </button>
        <button type="button" className={tab === "batch" ? "on" : ""} onClick={() => setTab("batch")}>
          {t("tabBatch")}
        </button>
      </nav>

      {tab === "batch" ? (
        <section className="panel">
          <p>{t("batchIntro")}</p>
          <button type="button" className="btn secondary" onClick={batchConvert} disabled={loading}>
            {t("batchPick")}
          </button>
        </section>
      ) : (
        <>
          {tab === "drop" && (
            <section
              className="drop"
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              role="region"
              aria-label={t("dropRegionAria")}
            >
              <p>{t("dropDrag")}</p>
              <button type="button" className="btn secondary" onClick={pickAbcFile}>
                {t("dropPick")}
              </button>
            </section>
          )}

          <section className="panel">
            <label htmlFor="abc" className="label">
              {t("labelAbc")}
            </label>
            <textarea
              id="abc"
              dir="ltr"
              className="editor"
              spellCheck={false}
              rows={14}
              value={abcText}
              onChange={(e) => {
                setAbcText(e.target.value);
                setResult(null);
              }}
              style={
                highlightLine
                  ? {
                      boxShadow: `inset 0 0 0 2px var(--accent)`,
                    }
                  : undefined
              }
            />
            {tuneCount > 1 && (
              <div className="row">
                <label htmlFor="ti">{t("tuneInFile")}</label>
                <select
                  id="ti"
                  value={tuneIndex}
                  onChange={(e) => setTuneIndex(parseInt(e.target.value, 10))}
                >
                  {Array.from({ length: tuneCount }, (_, i) => (
                    <option key={i} value={i}>
                      {ti("tuneOf", { n: String(i + 1), total: String(tuneCount) })}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="actions">
              <button type="button" className="btn primary big" onClick={runConvert} disabled={loading}>
                {loading ? t("converting") : t("convert")}
              </button>
              {loading && <span className="progress" aria-busy="true" />}
            </div>
          </section>
        </>
      )}

      {result && (
        <section className={`panel messages ${result.success ? "ok" : "err"}`}>
          <h2>{result.success ? t("resultOk") : t("resultCheck")}</h2>
          <ul className="msglist">
            {result.messages.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
          {uiError && (
            <p className="ui-error" role="alert">
              {uiError}
            </p>
          )}
          {uiInfo && <p className="ui-info">{uiInfo}</p>}
          {result.success && (
            <div className="row wrap action-row">
              <button type="button" className="btn primary" onClick={saveXml}>
                {t("saveMusicXml")}
              </button>
              <button type="button" className="btn secondary" onClick={openInMuseScore}>
                {t("openMuseScore")}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={saveMidiBinary}
                disabled={!result.midiBytes?.length}
                title={
                  result.midiBytes?.length
                    ? undefined
                    : t("midiUnavailableTitle")
                }
              >
                {t("exportMidi")}
              </button>
            </div>
          )}
        </section>
      )}

      {livePreview && <PreviewCard p={livePreview} />}

      {history.length > 0 && (
        <section className="panel history" aria-labelledby="hist">
          <h2 id="hist">{t("recentFiles")}</h2>
          <ul>
            {history.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className="linkish"
                  onClick={() => {
                    setAbcText(h.snippet);
                    setTab("paste");
                  }}
                >
                  {h.label}
                </button>
                <span className="muted">{new Date(h.at).toLocaleString(dateLocale)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="foot">
        <p className="foot-hint muted">{t("footer")}</p>
        <div className="foot-legal" role="contentinfo">
          <p className="foot-copyright">{ti("footerCopyright", { year: String(new Date().getFullYear()) })}</p>
          <p className="foot-ip">{t("footerIpNotice")}</p>
        </div>
      </footer>
    </div>
  );
}

function PreviewCard({ p }: { p: AbcPreview }) {
  const { t } = useI18n();
  return (
    <section className="panel preview" aria-label={t("previewAria")}>
      <h2>{t("previewHeading")}</h2>
      <dl className="grid">
        <dt>{t("previewTitle")}</dt>
        <dd>{p.title ?? t("previewDash")}</dd>
        <dt>{t("previewComposer")}</dt>
        <dd>{p.composer ?? t("previewDash")}</dd>
        <dt>{t("previewMeter")}</dt>
        <dd>{p.meter}</dd>
        <dt>{t("previewKey")}</dt>
        <dd>{p.key}</dd>
        <dt>{t("previewTempo")}</dt>
        <dd>{p.tempo || t("previewDash")}</dd>
        <dt>{t("previewVoices")}</dt>
        <dd>{p.voiceCount}</dd>
      </dl>
    </section>
  );
}
