export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization, Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const cors = { "Access-Control-Allow-Origin": "*" };

    // GET /pair-data — serve pairData.json from R2
    if (request.method === "GET" && url.pathname === "/pair-data") {
      const object = await env.PAIR_DATA.get("pairData.json");
      if (!object) {
        return new Response("Not found", { status: 404, headers: cors });
      }
      return new Response(object.body, {
        headers: {
          ...cors,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    // PUT /pair-data — upload new pairData.json (admin only)
    if (request.method === "PUT" && url.pathname === "/pair-data") {
      const token = request.headers.get("Authorization");
      if (token !== `Bearer ${env.UPLOAD_SECRET}`) {
        return new Response("Unauthorized", { status: 401, headers: cors });
      }

      await env.PAIR_DATA.put("pairData.json", request.body, {
        httpMetadata: { contentType: "application/json" },
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404, headers: cors });
  },
};
