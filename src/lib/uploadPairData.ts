import type { PairData } from "../types";

export interface UploadProgress {
  step: "parsing" | "uploading-json" | "uploading-parquet" | "done";
  percent: number;
  label: string;
}

export async function uploadPairData(
  file: File,
  uploaderEmail?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ pairData: PairData; pairCount: number; cardCount: number }> {
  const secret = process.env.NEXT_PUBLIC_UPLOAD_SECRET;
  if (!secret) {
    throw new Error("Upload secret not configured");
  }

  // Step 1: Send file to Next.js API route for server-side parsing + upload
  onProgress?.({ step: "parsing", percent: 10, label: "Uploading parquet file to server..." });

  const formData = new FormData();
  formData.append("file", file);
  if (uploaderEmail) formData.append("email", uploaderEmail);

  const res = await fetch("/api/parse-parquet", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
    },
    body: formData,
  });

  onProgress?.({ step: "uploading-json", percent: 70, label: "Server is parsing & uploading..." });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Server error: ${res.status}`);
  }

  const result = await res.json();

  onProgress?.({ step: "done", percent: 100, label: "Complete!" });

  return {
    pairData: result.pairData as PairData,
    pairCount: result.pairCount,
    cardCount: result.cardCount,
  };
}
