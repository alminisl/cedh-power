import type { DeckAnalysis } from "../types";

interface StatsGridProps {
  stats: DeckAnalysis;
}

export default function StatsGrid({ stats }: StatsGridProps) {
  const items = [
    { label: "Total Pairs", value: stats.totalPairs.toLocaleString() },
    { label: "Pairs Found", value: stats.pairsFound.toLocaleString() },
    { label: "Pairs Missing", value: stats.pairsMissing.toLocaleString() },
    { label: "Avg Pair Power", value: stats.averagePairPower.toFixed(4) },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.label} className="glass rounded-xl p-4 text-center">
          <p className="text-xs text-text-muted uppercase tracking-wide mb-1">
            {item.label}
          </p>
          <p className="text-xl font-bold">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
