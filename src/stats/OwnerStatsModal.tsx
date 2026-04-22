import { useState } from "react";
import { useI18n } from "../i18n";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function OwnerStatsModal({ open, onClose }: Props) {
  const { t, ti } = useI18n();
  const readerUrl = import.meta.env.VITE_STATS_READER_URL?.trim();
  const [token, setToken] = useState("");
  const [visits, setVisits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    setError(null);
    setVisits(null);
    if (!readerUrl) {
      setError(t("statsOwnerNotConfigured"));
      return;
    }
    if (!token.trim()) {
      setError(t("statsOwnerNeedToken"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(readerUrl, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token.trim()}`,
        },
      });
      const text = await res.text();
      let n: number | undefined;
      try {
        const j = JSON.parse(text) as { visits?: number };
        if (typeof j.visits === "number" && Number.isFinite(j.visits)) n = j.visits;
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        setError(text.slice(0, 200) || t("statsOwnerLoadFailed"));
        return;
      }
      if (n === undefined) {
        setError(t("statsOwnerBadResponse"));
        return;
      }
      setVisits(n);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="stats-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-owner-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="stats-modal">
        <h2 id="stats-owner-title" className="stats-modal-title">
          {t("statsOwnerTitle")}
        </h2>
        <p className="stats-modal-intro">{t("statsOwnerIntro")}</p>
        {!readerUrl ? (
          <p className="stats-modal-warn">{t("statsOwnerNotConfigured")}</p>
        ) : (
          <>
            <label htmlFor="stats-token" className="stats-modal-label">
              {t("statsOwnerTokenLabel")}
            </label>
            <input
              id="stats-token"
              type="password"
              autoComplete="off"
              className="stats-modal-input"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t("statsOwnerTokenPlaceholder")}
            />
            <div className="stats-modal-actions">
              <button type="button" className="btn primary" onClick={loadStats} disabled={loading}>
                {loading ? t("statsOwnerLoading") : t("statsOwnerButton")}
              </button>
              <button type="button" className="btn secondary" onClick={onClose}>
                {t("statsOwnerClose")}
              </button>
            </div>
            {error && (
              <p className="stats-modal-error" role="alert">
                {error}
              </p>
            )}
            {visits !== null && (
              <p className="stats-modal-result" aria-live="polite">
                {ti("statsOwnerVisits", { n: String(visits) })}
              </p>
            )}
          </>
        )}
        <p className="stats-modal-hint muted">{t("statsOwnerShortcutHint")}</p>
      </div>
    </div>
  );
}
