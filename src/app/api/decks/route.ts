import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabaseServer";

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
