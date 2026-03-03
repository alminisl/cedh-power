import { History, Trash2 } from "lucide-react";

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  }) + " " + d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistorySidebar({ history, onClear }) {
  if (history.length === 0) return null;

  return (
    <aside className="w-72 shrink-0">
      <div className="glass rounded-xl p-4 sticky top-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <History className="w-4 h-4 text-accent" />
            History
          </h2>
          <button
            onClick={onClear}
            className="text-xs text-text-muted hover:text-red-400 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>

        <ul className="space-y-2 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
          {history.map((entry) => (
            <li
              key={entry.id}
              onClick={() => console.log("History entry clicked:", entry)}
              className="p-3 rounded-lg bg-bg/50 hover:bg-surface-light/50 transition-colors cursor-pointer border border-border/50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-semibold text-accent">
                  {entry.averagePairPower.toFixed(4)}
                </span>
                <span className="text-xs text-text-muted">
                  {entry.cardCount} cards
                </span>
              </div>
              <p className="text-xs text-text-muted truncate">
                {entry.firstCards.join(", ")}
              </p>
              <p className="text-xs text-text-muted/60 mt-1">
                {formatTime(entry.timestamp)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
