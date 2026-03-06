import { useState, useEffect, useCallback } from "react";
import type { PairData } from "../types";

const WORKER_URL = import.meta.env.VITE_WORKER_URL;

export function usePairData() {
  const [pairData, setPairData] = useState<PairData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // Try Cloudflare Worker (R2) first
      if (WORKER_URL) {
        try {
          const res = await fetch(`${WORKER_URL}/pair-data`);
          if (res.ok) {
            const json = await res.json();
            setPairData(json as PairData);
            setLoading(false);
            return;
          }
        } catch {
          // Fall through to bundled data
        }
      }

      // Fallback to bundled JSON
      try {
        const module = await import("../data/pairData.json");
        setPairData(module.default as PairData);
      } catch (err) {
        setError((err as Error).message);
      }
      setLoading(false);
    }

    load();
  }, []);

  const replacePairData = useCallback((data: PairData) => {
    setPairData(data);
  }, []);

  return { pairData, loading, error, replacePairData };
}
