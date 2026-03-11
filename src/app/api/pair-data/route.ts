import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "../../../lib/r2";

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

export async function PUT(request: NextRequest) {
  const token = request.headers.get("authorization");
  if (token !== `Bearer ${process.env.UPLOAD_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.text();

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: "pairData.json",
        Body: body,
        ContentType: "application/json",
      })
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    const name = err instanceof Error ? err.name : undefined;
    return NextResponse.json(
      { error: msg, name, stack, bucket: R2_BUCKET },
      { status: 500 }
    );
  }
}
