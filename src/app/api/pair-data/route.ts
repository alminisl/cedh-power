import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "../../../lib/r2";
import { NextResponse } from "next/server";

// The file is ~14MB; keep it in memory instead of pulling it from R2 on every page view.
// Short TTL so a new admin upload shows up within a few minutes.
const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: { body: string; ts: number } | null = null;

export async function GET() {
  try {
    if (!cached || Date.now() - cached.ts > CACHE_TTL_MS) {
      const res = await r2.send(
        new GetObjectCommand({ Bucket: R2_BUCKET, Key: "pairData.json" })
      );
      const body = await res.Body?.transformToString();
      if (!body) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      cached = { body, ts: Date.now() };
    }

    return new NextResponse(cached.body, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    if (cached) {
      return new NextResponse(cached.body, { headers: { "Content-Type": "application/json" } });
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
