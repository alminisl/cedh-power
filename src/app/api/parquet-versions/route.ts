import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "../../../lib/r2";
import { NextRequest, NextResponse } from "next/server";
import type { ParquetVersion } from "../../../types";

const VERSIONS_KEY = "parquetVersions.json";

export async function GET() {
  try {
    const res = await r2.send(
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: VERSIONS_KEY })
    );
    const body = await res.Body?.transformToString();
    if (!body) return NextResponse.json([]);
    return NextResponse.json(JSON.parse(body));
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization");
  if (token !== `Bearer ${process.env.UPLOAD_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const entry: ParquetVersion = await request.json();

    let versions: ParquetVersion[] = [];
    try {
      const res = await r2.send(
        new GetObjectCommand({ Bucket: R2_BUCKET, Key: VERSIONS_KEY })
      );
      const body = await res.Body?.transformToString();
      if (body) versions = JSON.parse(body);
    } catch {
      // File doesn't exist yet
    }

    versions.unshift(entry);

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: VERSIONS_KEY,
        Body: JSON.stringify(versions.slice(0, 50)),
        ContentType: "application/json",
      })
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
