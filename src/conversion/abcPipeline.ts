import abcjs from "abcjs";
import { buildMusicXmlFromTune } from "./musicXmlBuilder";
import { collectVoicesFromTune } from "./voiceExporter";
import { devLog } from "./logger";

export interface AbcPreview {
  title?: string;
  composer?: string;
  meter?: string;
  key?: string;
  tempo?: string;
  voiceCount: number;
  tuneIndex: number;
  tuneCount: number;
}

export interface ConvertResult {
  success: boolean;
  /** User-facing messages */
  messages: string[];
  /** If conversion produced output */
  musicXml?: string;
  midiBytes?: Uint8Array;
  preview?: AbcPreview;
  /** Line number for editor highlight (1-based) */
  problemLine?: number;
}

function friendlyParserWarning(w: string): string {
  const plain = w.replace(/<[^>]+>/g, "");
  const low = plain.toLowerCase();
  if (low.includes("warning") || low.includes("error")) {
    return plain
      .replace(/^warning:\s*/i, "שימו לב: ")
      .replace(/^error:\s*/i, "מצאנו בעיה: ");
  }
  return plain;
}

function extractLineFromWarning(w: string): number | undefined {
  const m = w.match(/line\s*:?\s*(\d+)/i) ?? w.match(/שורה\s*(\d+)/);
  if (m) return parseInt(m[1], 10);
  return undefined;
}

/**
 * סימון מקובל ב-ABC לדיאז הוא `^` לפני התו. הדבקות מספרים משתמשות לעיתים ב־`F#` —
 * ממירים אוטומטית כדי שלא ייווצרו אזהרות "Unknown character" ב־abcjs.
 */
export function normalizeHashSharpsToAbcCaret(abc: string): string {
  let s = abc;
  s = s.replace(/([A-Ga-g])##/g, "^^$1");
  s = s.replace(/([A-Ga-g])#/g, "^$1");
  return s;
}

/**
 * MuseScore / אוספים מייצאים לעיתים %%score (V1) + שורת V:V1 clef=treble לפני התווים.
 * abcjs (parseOnly) יוצר tune.lines ריק בפריסה כזו — בלי staff אין MusicXML.
 * כאן מסירים רק **פריסת score חד־קולית** (בלי פסיק/& בשורת %%score) ושורות V: לפני שורת המוזיקה הראשונה.
 */
export function stripSingleVoiceScoreLayout(abc: string): string {
  let s = abc.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = s.split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^%%score\s*\(/i.test(trimmed)) {
      const inner = trimmed
        .replace(/^%%score\s*\(\s*/i, "")
        .replace(/\)\s*$/i, "")
        .trim();
      if (inner && !/[,&]/.test(inner)) continue;
    }
    if (/^%%score\s*\{/i.test(trimmed)) {
      const inner = trimmed
        .replace(/^%%score\s*\{\s*/i, "")
        .replace(/\}\s*$/i, "")
        .trim();
      if (inner && !/[,&]/.test(inner)) continue;
    }
    kept.push(line);
  }
  s = kept.join("\n");

  const rows = s.split("\n");
  const isMusicLine = (l: string) => {
    const t = l.trim();
    if (!t || t.startsWith("%")) return false;
    if (!t.includes("|")) return false;
    return /[A-Ga-gZz]/.test(t) || /^\[[\w:/!]+\]/.test(t);
  };
  const musicIdx = rows.findIndex(isMusicLine);
  if (musicIdx <= 0) return s;
  const head = rows.slice(0, musicIdx).filter((l) => !/^\s*V:\S/i.test(l));
  return [...head, ...rows.slice(musicIdx)].join("\n");
}

/**
 * abcjs משאיר את `tune.lines` ריק אם יש **שורה ריקה מיד אחרי שדה כותרת** (למשל אחרי `K:`)
 * ולפני שורת התווים הראשונה — מצב נפוץ בהדבקה מספרים/אוספים.
 * מסירים רק רווחים כאלה כשהשורה הבאה אינה התחלת לחן חדש (`X:`).
 */
function collapseBlankAfterHeaderFields(s: string): string {
  let out = s;
  const fields = ["K", "L", "M", "P", "I"];
  for (const f of fields) {
    const re = new RegExp(
      `(^${f}:\\s*[^\\n]+)\\n(?:\\n)+(?!X:)`,
      "gm",
    );
    out = out.replace(re, "$1\n");
  }
  return out;
}

export function normalizeAbcForAbcjs(abc: string): string {
  let s = abc.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  s = collapseBlankAfterHeaderFields(s);
  s = stripSingleVoiceScoreLayout(s);
  s = collapseBlankAfterHeaderFields(s);
  s = normalizeHashSharpsToAbcCaret(s);
  return s;
}

export function buildPreviewForTune(tune: {
  metaText?: Record<string, string | { bpm?: number } | unknown>;
  lines: unknown[];
}, tuneIndex: number, tuneCount: number): AbcPreview {
  const mt = tune.metaText ?? {};
  const rawTitle = mt.title as string | string[] | undefined;
  const title = Array.isArray(rawTitle)
    ? rawTitle[0]
    : typeof rawTitle === "string"
      ? rawTitle
      : undefined;
  const composer =
    (typeof mt.composer === "string" ? mt.composer : undefined) ??
    (typeof mt.author === "string" ? mt.author : undefined);

  let meter = "?";
  try {
    const mf = (tune as { getMeterFraction?: () => { num: number; den: number } }).getMeterFraction?.();
    if (mf) meter = `${mf.num}/${mf.den}`;
  } catch {
    meter = "?";
  }

  let key = "?";
  try {
    const k = (tune as { getKeySignature?: () => { root?: string } }).getKeySignature?.();
    if (k?.root) key = String(k.root);
  } catch {
    key = "?";
  }

  let tempo = "";
  const t = mt.tempo as { bpm?: number; preString?: string } | undefined;
  if (t?.bpm) tempo = `${t.bpm} BPM`;

  let voiceCount = 0;
  try {
    const { voices } = collectVoicesFromTune(
      tune as Parameters<typeof collectVoicesFromTune>[0],
    );
    voiceCount = voices.length;
  } catch (e) {
    devLog.warn("preview voice count failed", e);
  }

  return {
    title,
    composer,
    meter,
    key,
    tempo,
    voiceCount,
    tuneIndex,
    tuneCount,
  };
}

export function convertAbcString(abc: string, selectedTuneIndex = 0): ConvertResult {
  const messages: string[] = [];

  const abcNormalized = normalizeAbcForAbcjs(abc);

  if (!abcNormalized.trim()) {
    return {
      success: false,
      messages: ["אין כאן טקסט ABC להמרה. הדביקו תווים או בחרו קובץ."],
    };
  }

  if (abcNormalized.length > 2_000_000) {
    return {
      success: false,
      messages: ["הקובץ גדול מאוד. נסו לצמצם או לפצל לקבצים קטנים יותר."],
    };
  }

  let tunes: unknown[];
  try {
    tunes = abcjs.parseOnly(abcNormalized) as unknown[];
  } catch (e) {
    devLog.warn("parseOnly threw", e);
    return {
      success: false,
      messages: [
        "לא הצלחנו לקרוא את הקובץ. נסו לבדוק שזה ABC תקין, או שימו לב לשורה שבה העורך מדגיש.",
      ],
    };
  }

  if (!tunes?.length) {
    return {
      success: false,
      messages: ["לא מצאנו לחן תקין. אולי חסרות שורות כמו X: או K:?"],
    };
  }

  const idx = Math.min(Math.max(0, selectedTuneIndex), tunes.length - 1);
  const tune = tunes[idx] as {
    warnings?: string[];
    metaText?: Record<string, unknown>;
    lines: unknown[];
    getMeterFraction: () => { num: number; den: number };
    getKeySignature: () => { accidentals?: { acc: string; note: string }[] };
  };

  if (tune.warnings?.length) {
    for (const w of tune.warnings) {
      const cleaned = friendlyParserWarning(w);
      /** אחרי נירמול F#→^F אזהרות כאלה לא אמורות להישאר — מדלגים על "רעש" ידוע */
      if (/Unknown character ignored.*#/i.test(cleaned)) continue;
      messages.push(cleaned);
    }
  }

  const xmlResult = buildMusicXmlFromTune(
    tune as Parameters<typeof buildMusicXmlFromTune>[0],
    idx,
  );
  messages.push(...xmlResult.warnings);

  let midiBytes: Uint8Array | undefined;
  try {
    const bin = abcjs.synth.getMidiFile(tune as never, {
      midiOutputType: "binary",
    }) as Uint8Array | string;
    if (bin instanceof Uint8Array) midiBytes = bin;
  } catch (e) {
    devLog.warn("MIDI export failed", e);
    messages.push("ייצוא MIDI לא הצליח — MusicXML עשוי להספיק.");
  }

  const preview = buildPreviewForTune(tune, idx, tunes.length);

  if (!xmlResult.xml) {
    const problemLine = tune.warnings?.map(extractLineFromWarning).find((n) => n !== undefined);
    return {
      success: false,
      messages,
      preview,
      problemLine: problemLine ?? undefined,
    };
  }

  return {
    success: true,
    messages,
    musicXml: xmlResult.xml,
    midiBytes,
    preview,
  };
}

export function parsePreviewOnly(abc: string, selectedTuneIndex = 0): AbcPreview | null {
  const n = normalizeAbcForAbcjs(abc);
  if (!n.trim()) return null;
  try {
    const tunes = abcjs.parseOnly(n) as unknown[];
    if (!tunes?.length) return null;
    const idx = Math.min(Math.max(0, selectedTuneIndex), tunes.length - 1);
    const tune = tunes[idx] as { metaText?: Record<string, unknown>; lines: unknown[] };
    return buildPreviewForTune(tune, idx, tunes.length);
  } catch {
    return null;
  }
}

export function countTunes(abc: string): number {
  try {
    const tunes = abcjs.parseOnly(normalizeAbcForAbcjs(abc)) as unknown[];
    return tunes?.length ?? 0;
  } catch {
    return 0;
  }
}
