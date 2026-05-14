import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET } from "../../../../lib/r2";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization");
  if (token !== `Bearer ${process.env.UPLOAD_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pdfKey = `primers/${randomUUID()}.pdf`;
    const thumbKey = `primers/thumbnails/${randomUUID()}.png`;

    const [url, thumbUrl] = await Promise.all([
      getSignedUrl(r2, new PutObjectCommand({ Bucket: R2_BUCKET, Key: pdfKey, ContentType: "application/pdf" }), { expiresIn: 300 }),
      getSignedUrl(r2, new PutObjectCommand({ Bucket: R2_BUCKET, Key: thumbKey, ContentType: "image/png" }), { expiresIn: 300 }),
    ]);

    return NextResponse.json({ url, key: pdfKey, thumbUrl, thumbKey });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
