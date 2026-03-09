import type { PairData } from "../types";

export function parseParquetFile(file: File): Promise<PairData> {
  return new Promise(async (resolve, reject) => {
    const worker = new Worker(
      new URL("./parquetWorker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (e: MessageEvent) => {
      worker.terminate();
      if (e.data.success) {
        resolve(e.data.pairData as PairData);
      } else {
        reject(new Error(e.data.error));
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(new Error(err.message || "Worker failed"));
    };

    const arrayBuffer = await file.arrayBuffer();
    worker.postMessage(arrayBuffer, [arrayBuffer]);
  });
}
