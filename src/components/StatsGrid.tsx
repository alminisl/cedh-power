import { useState } from "react";
import { Info } from "lucide-react";
import type { DeckAnalysis } from "../types";

interface StatsGridProps {
  stats: DeckAnalysis;
}

function StatTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow((v) => !v)}
        className="text-text-muted/60 hover:text-text-muted transition-colors cursor-help ml-1"
      >
        <Info className="w-3 h-3" />
      </button>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 px-3 py-2 text-xs text-text bg-surface border border-border rounded-lg shadow-lg z-50 text-left font-normal normal-case tracking-normal">
          {text}
        </span>
      )}
    </span>
  );
}

export default function StatsGrid({ stats }: StatsGridProps) {
  const items = [
    {
      label: "Total Pairs",
      value: stats.totalPairs.toLocaleString(),
      description: "The number of unique two-card combinations in your deck. A 100-card deck has 4,950 pairs.",
    },
    {
      label: "Pairs Found",
      value: stats.pairsFound.toLocaleString(),
      description: "How many of your deck's pairs have power data in our database. Higher means a more accurate analysis.",
    },
    {
      label: "Pairs Missing",
      value: stats.pairsMissing.toLocaleString(),
      description: "Pairs without data — these use a default power value (5.72). High numbers mean less reliable results.",
    },
    {
      label: "Avg Pair Power",
      value: stats.averagePairPower.toFixed(4),
      description: "The average power score across all pairs. Lower is stronger (1 = most powerful).",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {items.map((item) => (
        <div key={item.label} className="glass rounded-xl p-3 sm:p-4 text-center">
          <p className="text-xs text-text-muted uppercase tracking-wide mb-1">
            {item.label}
            <StatTooltip text={item.description} />
          </p>
          <p className="text-lg sm:text-xl font-bold">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
