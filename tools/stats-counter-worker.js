/**
 * Cloudflare Worker template — private visit counter for ABC NoteMate.
 *
 * Setup (summary):
 * 1. Create KV namespace (Workers → KV). Bind it in wrangler as STATS (or change code).
 * 2. Set secret ADMIN_TOKEN: wrangler secret put ADMIN_TOKEN
 * 3. Deploy this worker, copy its URL (e.g. https://abc-stats.xxx.workers.dev)
 * 4. In your app build (GitHub Actions env or .env.local, NOT committed with secrets):
 *    VITE_STATS_INGEST_URL = https://.../hit
 *    VITE_STATS_READER_URL = https://.../stats
 * 5. Open the app, press Ctrl+Shift+M (or triple-click logo), paste ADMIN_TOKEN to see count.
 *
 * POST /hit  — increments counter (public; consider rate limits in production)
 * GET /stats — returns {"visits":N} only with header Authorization: Bearer <ADMIN_TOKEN>
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";

    if (request.method === "POST" && path.endsWith("/hit")) {
      const cur = parseInt((await env.STATS.get("visits")) || "0", 10) || 0;
      const next = cur + 1;
      await env.STATS.put("visits", String(next));
      return new Response(JSON.stringify({ ok: true, visits: next }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    if (request.method === "GET" && path.endsWith("/stats")) {
      const auth = request.headers.get("Authorization") || "";
      const token = env.ADMIN_TOKEN || "";
      if (!token || auth !== `Bearer ${token}`) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { ...CORS, "Content-Type": "application/json" },
        });
      }
      const n = parseInt((await env.STATS.get("visits")) || "0", 10) || 0;
      return new Response(JSON.stringify({ visits: n }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    return new Response("not found", { status: 404, headers: CORS });
  },
};
