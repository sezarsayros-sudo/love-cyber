
const SITE_ORIGIN = "https://lodi-love-forever.sezarsayros.workers.dev";

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": SITE_ORIGIN,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Cache-Control": "no-store"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return response({ ok: true });
    }

    if (!env.VISITS || !env.ADMIN_PASSWORD) {
      return response({ error: "Server configuration missing" }, 500);
    }

    // تسجيل زيارة: الوقت فقط، دون أسماء أو عناوين IP
    if (url.pathname === "/api/visit" && request.method === "POST") {
      const timestamp = new Date().toISOString();
      const key = `${Date.now()}-${crypto.randomUUID()}`;

      await env.VISITS.put(key, timestamp);

      return response({ ok: true });
    }

    // لوحة الإحصائيات الخاصة
    if (url.pathname === "/api/stats" && request.method === "GET") {
      const auth = request.headers.get("Authorization") || "";
      const password = auth.startsWith("Bearer ")
        ? auth.slice(7)
        : "";

      if (password !== env.ADMIN_PASSWORD) {
        return response({ error: "Unauthorized" }, 401);
      }

      let cursor;
      let total = 0;
      const visits = [];
      let pages = 0;

      do {
        const result = await env.VISITS.list({
          limit: 1000,
          cursor
        });

        total += result.keys.length;

        for (const item of result.keys) {
          const timestamp = await env.VISITS.get(item.name);
          if (timestamp) visits.push(timestamp);
        }

        cursor = result.list_complete ? undefined : result.cursor;
        pages++;
      } while (cursor && pages < 10);

      visits.sort((a, b) => b.localeCompare(a));

      return response({
        ok: true,
        total,
        visits: visits.slice(0, 100),
        limited: !!cursor
      });
    }

    return response({ error: "Not found" }, 404);
  }
};
