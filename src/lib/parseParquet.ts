import { parquetRead } from "hyparquet";
import type { PairData } from "../types";

interface ParquetRow {
  left_name: string;
  right_name: string;
  Winrate: number;
  ConfidentChallenges: number;
  LogMultiplier: number;
  PowerRank: number;
}

export async function parseParquetFile(file: File): Promise<PairData> {
  const arrayBuffer = await file.arrayBuffer();

  const rows: ParquetRow[] = [];
  await parquetRead({
    file: arrayBuffer,
    onComplete: (data: unknown[][]) => {
      // hyparquet returns column-oriented data as array of arrays per row group
      // Each sub-array is a row with values in column order
      for (const row of data) {
        rows.push({
          left_name: row[0] as string,
          right_name: row[1] as string,
          Winrate: row[2] as number,
          ConfidentChallenges: row[3] as number,
          LogMultiplier: row[4] as number,
          PowerRank: row[5] as number,
        });
      }
    },
  });

  const pairData: PairData = {};
  for (const row of rows) {
    const [a, b] = [row.left_name, row.right_name].sort();
    const key = `${a}|||${b}`;
    pairData[key] = {
      w: Math.round(row.Winrate * 10000) / 10000,
      c: Math.round(row.ConfidentChallenges),
      l: Math.round(row.LogMultiplier * 10000) / 10000,
      p: Math.round(row.PowerRank * 10000) / 10000,
    };
  }

  return pairData;
}
