import { useState, useEffect, useCallback } from "react";
import type { PairData } from "../types";

const WORKER_URL = "https://bucket.cedhpower.com";

export function usePairData() {
  const [pairData, setPairData] = useState<PairData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // Primary: load from bundled JSON on disk
      try {
        const module = await import("../data/pairData.json");
        setPairData(module.default as PairData);
        setLoading(false);
        return;
      } catch {
        // Fall through to R2 backup
      }

      // Fallback: fetch from R2 cloud backup
      try {
        const res = await fetch(`${WORKER_URL}/pair-data`);
        if (res.ok) {
          const json = await res.json();
          setPairData(json as PairData);
          setLoading(false);
          return;
        }
      } catch {
        // ignore
      }

      setError("Failed to load pair data");
      setLoading(false);
    }

    load();
  }, []);

  const replacePairData = useCallback((data: PairData) => {
    setPairData(data);
  }, []);

  return { pairData, loading, error, replacePairData };
}
