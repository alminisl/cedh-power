import { useState, useEffect, useCallback } from "react";
import type { PairData } from "../types";

const CACHE_KEY = "pairData_cache";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const PAIR_DATA_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
  ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/pairData.json`
  : "/api/pair-data";

export function usePairData() {
  const [pairData, setPairData] = useState<PairData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const { data, ts } = JSON.parse(raw);
          if (Date.now() - ts < CACHE_TTL) {
            setPairData(data as PairData);
            setLoading(false);
            return;
          }
        }
      } catch {
        // ignore bad cache
      }

      try {
        const res = await fetch(PAIR_DATA_URL);
        if (res.ok) {
          const json = await res.json();
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ data: json, ts: Date.now() }));
          } catch {
            // storage quota exceeded — fine, just skip caching
          }
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
