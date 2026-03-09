export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Original-Filename, X-Pair-Count, X-Card-Count, X-Uploaded-By",
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

    // PUT /parquet-version — store raw parquet file with timestamp key + metadata
    if (request.method === "PUT" && url.pathname === "/parquet-version") {
      const token = request.headers.get("Authorization");
      if (token !== `Bearer ${env.UPLOAD_SECRET}`) {
        return new Response("Unauthorized", { status: 401, headers: cors });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const r2Key = `versions/${timestamp}.parquet`;

      // Read custom metadata from headers
      const originalFilename = request.headers.get("X-Original-Filename") || "";
      const pairCount = request.headers.get("X-Pair-Count") || "0";
      const cardCount = request.headers.get("X-Card-Count") || "0";
      const uploadedBy = request.headers.get("X-Uploaded-By") || "";

      const body = await request.arrayBuffer();
      await env.PARQUET_VERSIONS.put(r2Key, body, {
        httpMetadata: { contentType: "application/octet-stream" },
        customMetadata: {
          originalFilename,
          pairCount,
          cardCount,
          uploadedBy,
        },
      });

      return new Response(
        JSON.stringify({ ok: true, r2_key: r2Key, size: body.byteLength }),
        { headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // GET /versions — list all parquet versions from R2 with metadata
    if (request.method === "GET" && url.pathname === "/versions") {
      const token = request.headers.get("Authorization");
      if (token !== `Bearer ${env.UPLOAD_SECRET}`) {
        return new Response("Unauthorized", { status: 401, headers: cors });
      }

      const listed = await env.PARQUET_VERSIONS.list({ prefix: "versions/" });
      const versions = [];

      for (const obj of listed.objects) {
        // Fetch each object's head to get custom metadata
        const head = await env.PARQUET_VERSIONS.head(obj.key);
        const meta = head?.customMetadata || {};

        versions.push({
          r2_key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded.toISOString(),
          original_filename: meta.originalFilename || null,
          pair_count: parseInt(meta.pairCount || "0", 10),
          card_count: parseInt(meta.cardCount || "0", 10),
          uploaded_by: meta.uploadedBy || null,
        });
      }

      // Sort newest first
      versions.sort((a, b) => b.uploaded.localeCompare(a.uploaded));

      return new Response(JSON.stringify(versions), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // GET /parquet-version/<key> — fetch a specific parquet file from R2 (admin only)
    if (request.method === "GET" && url.pathname.startsWith("/parquet-version/")) {
      const token = request.headers.get("Authorization");
      if (token !== `Bearer ${env.UPLOAD_SECRET}`) {
        return new Response("Unauthorized", { status: 401, headers: cors });
      }

      const r2Key = decodeURIComponent(url.pathname.replace("/parquet-version/", ""));
      const object = await env.PARQUET_VERSIONS.get(r2Key);
      if (!object) {
        return new Response("Not found", { status: 404, headers: cors });
      }

      return new Response(object.body, {
        headers: {
          ...cors,
          "Content-Type": "application/octet-stream",
        },
      });
    }

    return new Response("Not found", { status: 404, headers: cors });
  },
};
