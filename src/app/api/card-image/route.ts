import { NextRequest, NextResponse } from "next/server";

async function resolveImageUrl(name: string, version: string): Promise<string | null> {
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
      const card = (data.cards ?? []).find(
        (c: { name?: string }) => c.name?.toLowerCase() === nameLower
      ) ?? data.cards?.[0];

      const imageUris = card?.image_uris ?? card?.card_faces?.[0]?.image_uris;
      if (imageUris) {
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

  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: imageUrl,
      // Card images are permanent — cache at CDN for 7 days
      "Cache-Control": "public, max-age=86400, s-maxage=604800",
      "Netlify-CDN-Cache-Control": "public, s-maxage=604800",
    },
  });
}
