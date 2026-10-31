import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, getServiceSupabase } from "../../../lib/supabaseServer";
import { getRequestUser } from "../../../lib/requireAdmin";
import { getPairData } from "../../../lib/serverPairData";
import { analyzeDeck } from "../../../lib/deckAnalyzer";

export async function GET() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("decklists")
    .select(
      "id, user_id, deck_name, commander, color_identity, power_rank, average_pair_power, pairs_found, pairs_missing, total_pairs, created_at, updated_at"
    )
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

const COLORS = new Set(["W", "U", "B", "R", "G"]);

// Saves a deck with its score computed here, so clients can't submit their own power rank.
export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const cards: unknown = body?.cards;
  if (
    !Array.isArray(cards) ||
    cards.length === 0 ||
    cards.length > 250 ||
    !cards.every((c) => typeof c === "string" && c.length > 0 && c.length < 200)
  ) {
    return NextResponse.json({ error: "Invalid card list" }, { status: 400 });
  }
  const commander = typeof body.commander === "string" ? body.commander.slice(0, 200) : "";
  const deckName = typeof body.deck_name === "string" ? body.deck_name.trim().slice(0, 200) : "";
  const colorIdentity = Array.isArray(body.color_identity)
    ? body.color_identity.filter((c: unknown) => typeof c === "string" && COLORS.has(c))
    : [];

  const pairData = await getPairData();
  if (!pairData) {
    return NextResponse.json({ error: "Pair data unavailable" }, { status: 503 });
  }
  const analysis = analyzeDeck(cards as string[], pairData);

  try {
    const { data, error } = await getServiceSupabase()
      .from("decklists")
      .insert({
        user_id: user.id,
        deck_name: deckName || commander || null,
        commander: commander || null,
        color_identity: colorIdentity,
        cards,
        power_rank: analysis.totalPowerRank,
        average_pair_power: analysis.averagePairPower,
        pairs_found: analysis.pairsFound,
        pairs_missing: analysis.pairsMissing,
        total_pairs: analysis.totalPairs,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
