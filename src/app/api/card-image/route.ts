import { NextRequest, NextResponse } from "next/server";

const serverCache = new Map<string, { urls: Record<string, string>; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name = searchParams.get("name");
  const version = searchParams.get("version") ?? "normal";

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const now = Date.now();
  const cached = serverCache.get(name);
  if (cached && now - cached.ts < CACHE_TTL) {
    const url = cached.urls[version];
    if (url) return NextResponse.redirect(url);
  }

  try {
    const res = await fetch("https://brackend.brackcheck.com/api/cards/bulk-by-names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names: [name] }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: res.statusText }, { status: res.status });
    }

    const data = await res.json();
    const card = data.cards?.[0];

    if (!card?.image_uris) {
      return NextResponse.json({ error: "card not found" }, { status: 404 });
    }

    serverCache.set(name, { urls: card.image_uris, ts: now });

    const url = card.image_uris[version] ?? card.image_uris.normal;
    return NextResponse.redirect(url);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
