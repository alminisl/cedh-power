import { NextRequest, NextResponse } from "next/server";

// Process-local cache maps card name → { version → image URL }.
// This survives repeated requests within the same serverless instance
// and eliminates round-trips to brackend for warm instances.
const serverCache = new Map<string, { urls: Record<string, string>; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// CDN + browser cache duration for image responses.
// After the first request populates Vercel's edge cache, all subsequent
// requests are served from the CDN in ~10 ms without touching this route.
const IMAGE_CACHE_HEADER = "public, max-age=86400";

async function resolveImageUrl(name: string, version: string): Promise<string | null> {
  const now = Date.now();
  const cached = serverCache.get(name);
  if (cached && now - cached.ts < CACHE_TTL) {
    return cached.urls[version] ?? cached.urls["normal"] ?? null;
  }

  // Try brackend first
  try {
    const res = await fetch("https://brackend.brackcheck.com/api/cards/bulk-by-names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names: [name] }),
    });

    if (res.ok) {
      const data = await res.json();
      const nameLower = name.toLowerCase();
      // Find the card that actually matches the requested name — don't blindly take [0]
      // because the API may return cards in any order or return unrelated cards.
      const card = (data.cards ?? []).find(
        (c: { name?: string }) => c.name?.toLowerCase() === nameLower
      ) ?? data.cards?.[0];

      // Support both normal cards (image_uris) and DFCs (card_faces[0].image_uris)
      const imageUris = card?.image_uris ?? card?.card_faces?.[0]?.image_uris;
      if (imageUris) {
        serverCache.set(name, { urls: imageUris, ts: now });
        return imageUris[version] ?? imageUris["normal"] ?? null;
      }
    }
  } catch {
    // fall through to Scryfall
  }

  // Fallback: fetch directly from Scryfall
  try {
    const scryfallRes = await fetch(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`
    );
    if (!scryfallRes.ok) return null;
    const card = await scryfallRes.json();
    const imageUris = card?.image_uris ?? card?.card_faces?.[0]?.image_uris;
    if (!imageUris) return null;
    serverCache.set(name, { urls: imageUris, ts: now });
    return imageUris[version] ?? imageUris["normal"] ?? null;
  } catch {
    return null;
  }
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
