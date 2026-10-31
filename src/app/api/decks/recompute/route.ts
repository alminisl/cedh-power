import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "../../../../lib/supabaseServer";
import { requireAdmin } from "../../../../lib/requireAdmin";
import { getPairData } from "../../../../lib/serverPairData";
import { analyzeDeck } from "../../../../lib/deckAnalyzer";

export const maxDuration = 300;

// Re-scores every saved deck against the current pair data and records a snapshot.
// Runs server-side because RLS only lets a user update their own decks.
export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getServiceSupabase();
    // Force a fresh read: this usually runs right after a new upload to R2.
    const pairData = await getPairData(true);
    if (!pairData) throw new Error("Pair data unavailable");

    const decks: { id: string; cards: string[]; power_rank: number | null; commander: string | null }[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("decklists")
        .select("id, cards, power_rank, commander")
        .order("id")
        .range(from, from + 999);
      if (error) throw new Error(error.message);
      decks.push(...data);
      if (data.length < 1000) break;
    }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();
    let improved = 0, dropped = 0, unchanged = 0;
    let topMover: { name: string; delta: number } | null = null;
    const snapshots = [];
    const updates = [];

    for (const deck of decks) {
      const analysis = analyzeDeck(deck.cards, pairData);
      const delta = analysis.totalPowerRank - (deck.power_rank ?? 0);
      // Lower power = stronger
      if (delta < -0.001) improved++;
      else if (delta > 0.001) dropped++;
      else unchanged++;
      if (!topMover || Math.abs(delta) > Math.abs(topMover.delta)) {
        topMover = { name: deck.commander ?? deck.id, delta };
      }

      const stats = {
        power_rank: analysis.totalPowerRank,
        average_pair_power: analysis.averagePairPower,
        pairs_found: analysis.pairsFound,
        pairs_missing: analysis.pairsMissing,
      };
      snapshots.push({ deck_id: deck.id, snapshot_date: today, ...stats });
      updates.push({ id: deck.id, ...stats, total_pairs: analysis.totalPairs, updated_at: now });
    }

    for (let i = 0; i < updates.length; i += 20) {
      const results = await Promise.all(
        updates.slice(i, i + 20).map(({ id, ...row }) =>
          supabase.from("decklists").update(row).eq("id", id)
        )
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw new Error(failed.error.message);
    }

    for (let i = 0; i < snapshots.length; i += 500) {
      const { error } = await supabase.from("deck_snapshots").insert(snapshots.slice(i, i + 500));
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ count: decks.length, improved, dropped, unchanged, topMover });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
