import { NextRequest, NextResponse } from "next/server";

// Process-local cache maps card name → { version → image URL }.
// This survives repeated requests within the same serverless instance
// and eliminates round-trips to brackend for warm instances.
const serverCache = new Map<string, { urls: Record<string, string>; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// CDN + browser cache duration for image responses.
// After the first request populates Vercel's edge cache, all subsequent
// requests are served from the CDN in ~10 ms without touching this route.
const IMAGE_CACHE_HEADER = "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400";

async function resolveImageUrl(name: string, version: string): Promise<string | null> {
  const now = Date.now();
  const cached = serverCache.get(name);
  if (cached && now - cached.ts < CACHE_TTL) {
    return cached.urls[version] ?? cached.urls["normal"] ?? null;
  }

  const res = await fetch("https://brackend.brackcheck.com/api/cards/bulk-by-names", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ names: [name] }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const card = data.cards?.[0];
  if (!card?.image_uris) return null;

  serverCache.set(name, { urls: card.image_uris, ts: now });
  return card.image_uris[version] ?? card.image_uris["normal"] ?? null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name = searchParams.get("name");
  const version = searchParams.get("version") ?? "normal";

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  let imageUrl: string | null = null;
  try {
    imageUrl = await resolveImageUrl(name, version);
  } catch {
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }

  if (!imageUrl) {
    return NextResponse.json({ error: "card not found" }, { status: 404 });
  }

  // Proxy the image bytes so the response can be cached by the browser and
  // Vercel's CDN. A redirect (307) is never cached by browsers; a proxied
  // response with Cache-Control is cached for 24 hours at both layers.
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      // Upstream CDN error — fall back to a cacheable redirect so the
      // browser at least gets the image without adding latency.
      return new NextResponse(null, {
        status: 307,
        headers: {
          Location: imageUrl,
          "Cache-Control": IMAGE_CACHE_HEADER,
        },
      });
    }

    const contentType = imgRes.headers.get("Content-Type") ?? "image/jpeg";
    const body = await imgRes.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": IMAGE_CACHE_HEADER,
        // Allow downstream caches to vary by Accept (future webp support)
        Vary: "Accept",
      },
    });
  } catch {
    // If proxying fails for any reason, redirect as a last resort.
    return new NextResponse(null, {
      status: 307,
      headers: {
        Location: imageUrl,
        "Cache-Control": IMAGE_CACHE_HEADER,
      },
    });
  }
}
