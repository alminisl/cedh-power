import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "../../../lib/r2";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await r2.send(
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: "pairData.json" })
    );

    const body = await res.Body?.transformToString();
    if (!body) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json",
        // CDN caches for 1h; browsers revalidate after 5min but use stale for 1h
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=3600",
        "Netlify-CDN-Cache-Control": "public, s-maxage=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
