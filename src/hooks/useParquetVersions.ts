import { useState, useEffect, useCallback } from "react";
import type { ParquetVersion } from "../types";

const WORKER_URL = "https://bucket.cedhpower.com";
const UPLOAD_SECRET = process.env.NEXT_PUBLIC_UPLOAD_SECRET;

export function useParquetVersions() {
  const [versions, setVersions] = useState<ParquetVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    if (!WORKER_URL || !UPLOAD_SECRET) {
      setError("Worker URL or upload secret not configured");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${WORKER_URL}/versions`, {
        headers: { Authorization: `Bearer ${UPLOAD_SECRET}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch versions: ${res.status}`);
      const data: ParquetVersion[] = await res.json();
      setVersions(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  return { versions, loading, error, refetch: fetchVersions };
}
