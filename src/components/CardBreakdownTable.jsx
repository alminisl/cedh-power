import { useState, useMemo } from "react";
import { Search, ArrowUpDown } from "lucide-react";
import CardTooltip from "./CardTooltip";

function getQuartileColor(value, min, max) {
  const range = max - min;
  if (range === 0) return "bg-gray-500";
  const pct = (value - min) / range;
  if (pct >= 0.75) return "bg-green-500";
  if (pct >= 0.5) return "bg-emerald-500";
  if (pct >= 0.25) return "bg-amber-500";
  return "bg-red-500";
}

export default function CardBreakdownTable({ breakdown }) {
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState("avgPairPower");
  const [sortAsc, setSortAsc] = useState(false);

  const { min, max } = useMemo(() => {
    const powers = breakdown.map((c) => c.avgPairPower);
    return { min: Math.min(...powers), max: Math.max(...powers) };
  }, [breakdown]);

  const sorted = useMemo(() => {
    const filtered = filter
      ? breakdown.filter((c) =>
          c.name.toLowerCase().includes(filter.toLowerCase()),
        )
      : breakdown;

    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? av - bv : bv - av;
    });
  }, [breakdown, filter, sortKey, sortAsc]);

  function toggleSort(key) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const columns = [
    { key: "name", label: "Card Name" },
    { key: "avgPairPower", label: "Avg Power" },
    { key: "contribution", label: "Contribution" },
    { key: "pairsFound", label: "Found" },
    { key: "pairsMissing", label: "Missing" },
  ];

  return (
    <div className="glass rounded-xl p-4 overflow-hidden">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Filter cards..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-bg border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <span className="text-xs text-text-muted">
          {sorted.length} card{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="w-8 py-2 text-left text-text-muted font-medium">#</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="py-2 text-left text-text-muted font-medium cursor-pointer hover:text-text transition-colors select-none"
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
              ))}
              <th className="py-2 text-left text-text-muted font-medium w-32">
                Power Bar
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((card, i) => {
              const barWidth =
                max > min
                  ? ((card.avgPairPower - min) / (max - min)) * 100
                  : 50;

              return (
                <tr
                  key={card.name}
                  className="border-b border-border/50 hover:bg-surface-light/50 transition-colors"
                >
                  <td className="py-2 text-text-muted">{i + 1}</td>
                  <td className="py-2 font-medium">
                    <CardTooltip cardName={card.name}>
                      {card.name}
                    </CardTooltip>
                  </td>
                  <td className="py-2 font-mono">{card.avgPairPower.toFixed(4)}</td>
                  <td className="py-2 font-mono">{card.contribution.toFixed(2)}</td>
                  <td className="py-2">{card.pairsFound}</td>
                  <td className="py-2">{card.pairsMissing}</td>
                  <td className="py-2">
                    <div className="w-full bg-bg rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all ${getQuartileColor(card.avgPairPower, min, max)}`}
                        style={{ width: `${Math.max(barWidth, 2)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
