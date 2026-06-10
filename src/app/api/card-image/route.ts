import { NextRequest, NextResponse } from "next/server";

const APP_ORIGIN = process.env.APP_ORIGIN ?? "http://localhost:3000";

async function resolveImageUrl(name: string, version: string): Promise<string> {
  // Try brackend first for a direct CDN URL
  try {
    const res = await fetch("https://brackend.brackcheck.com/api/cards/bulk-by-names", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": APP_ORIGIN },
      body: JSON.stringify({ names: [name] }),
    });

    if (res.ok) {
      const data = await res.json();
      const nameLower = name.toLowerCase();
      const card = (data.cards ?? []).find(
        (c: { name?: string }) => c.name?.toLowerCase() === nameLower
      ) ?? data.cards?.[0];

      const imageUris = card?.image_uris ?? card?.card_faces?.[0]?.image_uris;
      const imageUrl = imageUris?.[version] ?? imageUris?.["normal"] ?? null;
      if (imageUrl) return imageUrl;
    }
  } catch {
    // fall through to Scryfall
  }

  // Fallback: redirect browser directly to Scryfall's image endpoint — no server-side fetch needed
  return `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}&format=image&version=${version}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name = searchParams.get("name");
  const version = searchParams.get("version") ?? "normal";

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const imageUrl = await resolveImageUrl(name, version);

  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: imageUrl,
      "Cache-Control": "public, max-age=604800, immutable",
    },
  });
}
