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
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
