import { parquetRead } from "hyparquet";

function toNumber(val: unknown): number {
  if (typeof val === "bigint") return Number(val);
  if (typeof val === "number") return val;
  return 0;
}

self.onmessage = async (e: MessageEvent<ArrayBuffer>) => {
  try {
    const arrayBuffer = e.data;
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

    self.postMessage({ success: true, pairData });
  } catch (err) {
    self.postMessage({ success: false, error: (err as Error).message });
  }
};
