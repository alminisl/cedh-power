import { NextRequest, NextResponse } from "next/server";
import { parquetRead } from "hyparquet";

export const maxDuration = 300;


function toNumber(val: unknown): number {
  if (typeof val === "bigint") return Number(val);
  if (typeof val === "number") return val;
  return 0;
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || secret !== process.env.UPLOAD_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const pairData: Record<string, { w: number; c: number; l: number; p: number }> = {};

    await parquetRead({
      file: arrayBuffer,
      onComplete: (data: unknown[][]) => {
        for (const row of data) {
          const leftName = String(row[0]);
          const rightName = String(row[1]);
          const [a, b] = [leftName, rightName].sort();
          const key = `${a}|||${b}`;
          pairData[key] = {
            w: Math.round(toNumber(row[2]) * 10000) / 10000,
            c: Math.round(toNumber(row[3])),
            l: Math.round(toNumber(row[4]) * 10000) / 10000,
            p: Math.round(toNumber(row[5]) * 10000) / 10000,
          };
        }
      },
    });

    const pairCount = Object.keys(pairData).length;
    const cardNames = new Set<string>();
    for (const key of Object.keys(pairData)) {
      const [a, b] = key.split("|||");
      cardNames.add(a);
      cardNames.add(b);
    }
    const cardCount = cardNames.size;

    // Upload parsed JSON directly to R2
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { r2, R2_BUCKET } = await import("../../../lib/r2");

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: "pairData.json",
        Body: JSON.stringify(pairData),
        ContentType: "application/json",
      })
    );

    return NextResponse.json({ pairData, pairCount, cardCount });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
