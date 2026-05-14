import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "../../../../../lib/r2";
import { getServerSupabase } from "../../../../../lib/supabaseServer";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = getServerSupabase();
  const { data: primer, error } = await supabase
    .from("primers")
    .select("thumbnail_key")
    .eq("id", id)
    .single();

  if (error || !primer?.thumbnail_key) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const response = await r2.send(
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: primer.thumbnail_key })
    );

    return new NextResponse(response.Body as ReadableStream, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
