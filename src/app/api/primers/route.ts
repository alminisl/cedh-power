import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabaseServer";

export async function GET() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("primers")
    .select("id, title, commander, deck_id, file_key, file_name, uploaded_by, created_at, thumbnail_key")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization");
  if (token !== `Bearer ${process.env.UPLOAD_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, commander, deck_id, file_key, file_name, uploaded_by, thumbnail_key } = body;

    if (!title?.trim() || !commander?.trim() || !file_key || !file_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("primers")
      .insert({
        title: title.trim(),
        commander: commander.trim(),
        deck_id: deck_id || null,
        file_key,
        file_name,
        uploaded_by: uploaded_by || null,
        thumbnail_key: thumbnail_key || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
