const SESSION_KEY = "abc-notemate-stats-ping-v1";

/** Fire-and-forget: one anonymous hit per browser session when ingest URL is configured. */
export function sendOptionalVisitPing(): void {
  const url = import.meta.env.VITE_STATS_INGEST_URL?.trim();
  if (!url) return;
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return;
  } catch {
    return;
  }
  void fetch(url, {
    method: "POST",
    mode: "cors",
    credentials: "omit",
    headers: { Accept: "application/json" },
    body: "{}",
  })
    .then(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
    })
    .catch(() => {
      /* silent */
    });
}
