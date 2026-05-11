import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "../../../../lib/r2";
import { getServerSupabase } from "../../../../lib/supabaseServer";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.headers.get("authorization");
  if (token !== `Bearer ${process.env.UPLOAD_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getServerSupabase();

  const { data: primer, error: fetchErr } = await supabase
    .from("primers")
    .select("file_key")
    .eq("id", id)
    .single();

  if (fetchErr || !primer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: primer.file_key }));
  } catch {
    // Continue — delete DB record even if R2 object is already gone
  }

  const { error } = await supabase.from("primers").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
