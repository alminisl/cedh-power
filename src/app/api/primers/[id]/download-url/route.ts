import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET } from "../../../../../lib/r2";
import { getServerSupabase } from "../../../../../lib/supabaseServer";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const type = request.nextUrl.searchParams.get("type") ?? "view";

  const supabase = getServerSupabase();
  const { data: primer, error } = await supabase
    .from("primers")
    .select("file_key, file_name")
    .eq("id", id)
    .single();

  if (error || !primer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const disposition =
      type === "download"
        ? `attachment; filename="${primer.file_name}"`
        : "inline";

    const url = await getSignedUrl(
      r2,
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: primer.file_key,
        ResponseContentType: "application/pdf",
        ResponseContentDisposition: disposition,
      }),
      { expiresIn: 900 }
    );

    return NextResponse.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
