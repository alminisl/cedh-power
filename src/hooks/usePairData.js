import { useState, useEffect } from "react";

export function usePairData() {
  const [pairData, setPairData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    import("../data/pairData.json")
      .then((module) => {
        setPairData(module.default);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { pairData, loading, error };
}
