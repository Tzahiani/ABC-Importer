/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** POST URL — increments visit counter once per session (optional). */
  readonly VITE_STATS_INGEST_URL?: string;
  /** GET URL — returns JSON { visits: number } with Authorization: Bearer <secret>. */
  readonly VITE_STATS_READER_URL?: string;
}
