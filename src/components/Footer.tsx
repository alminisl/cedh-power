import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { ParquetVersion } from "../types";

export default function Footer() {
  const [latest, setLatest] = useState<ParquetVersion | null>(null);

  const versionsUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
    ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/parquetVersions.json`
    : "/api/parquet-versions";

  useEffect(() => {
    fetch(versionsUrl)
      .then((r) => r.json())
      .then((versions: ParquetVersion[]) => {
        if (Array.isArray(versions) && versions.length > 0) setLatest(versions[0]);
      })
      .catch(() => {});
  }, []);

  const uploadedDate = latest?.uploaded
    ? new Date(latest.uploaded).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null;

  return (
    <footer className="mt-auto border-t border-border/50 py-6">
      <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted">
        <div className="flex items-center gap-3 flex-wrap">
          <span>cEDH Power Ranker &middot; Alpha</span>
          {latest && (
            <span className="text-text-muted/60">
              Dataset:{" "}
              <span className="text-text-muted">
                {latest.pair_count?.toLocaleString() ?? "?"} pairs
              </span>
              {uploadedDate && <> &middot; updated {uploadedDate}</>}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link to="/about" className="hover:text-text transition-colors">
            About
          </Link>
          <Link to="/leaderboard" className="hover:text-text transition-colors">
            Leaderboard
          </Link>
          <Link to="/compare" className="hover:text-text transition-colors">
            Compare
          </Link>
        </div>
      </div>
    </footer>
  );
}
