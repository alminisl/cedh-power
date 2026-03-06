import { useState, useEffect, useCallback } from "react";
import type { PairData } from "../types";

export function usePairData() {
  const [pairData, setPairData] = useState<PairData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    import("../data/pairData.json")
      .then((module) => {
        setPairData(module.default as PairData);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const replacePairData = useCallback((data: PairData) => {
    setPairData(data);
  }, []);

  return { pairData, loading, error, replacePairData };
}
