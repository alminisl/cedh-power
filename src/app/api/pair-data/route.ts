import { NextRequest, NextResponse } from "next/server";
import { getPairDataRaw } from "../../../lib/serverPairData";

export async function GET(request: NextRequest) {
  const data = await getPairDataRaw();
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Short max-age so new uploads reach users quickly; the ETag makes the
  // revalidation a cheap 304 instead of re-downloading 3.7MB.
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
    ETag: data.etag,
  };
  if (request.headers.get("if-none-match") === data.etag) {
    return new NextResponse(null, { status: 304, headers });
  }
  return new NextResponse(data.body, { headers });
}
