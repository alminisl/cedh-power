import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "../../../../lib/supabaseServer";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServerSupabase();

  const [deckResult, snapshotsResult] = await Promise.all([
    supabase.from("decklists").select("*").eq("id", id).single(),
    supabase
      .from("deck_snapshots")
      .select("snapshot_date, power_rank")
      .eq("deck_id", id)
      .order("snapshot_date", { ascending: true }),
  ]);

  if (deckResult.error) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...deckResult.data,
    snapshots: snapshotsResult.data ?? [],
  });
}
