import { useState } from "react";
import { Save, CheckCircle, X, Link, TrendingDown, TrendingUp } from "lucide-react";
import type { DeckAnalysis, PairData, ScryfallCardData } from "../types";
import PowerRankHero from "./PowerRankHero";
import StatsGrid from "./StatsGrid";
import CardBreakdownTable from "./CardBreakdownTable";
import SwapTester from "./SwapTester";
import UpgradeSuggestions from "./UpgradeSuggestions";
import { useCommanderPercentile } from "../hooks/useCommanderPercentile";

export interface SessionPoint {
  label: string;
  power: number;
}

interface ResultsDashboardProps {
  results: DeckAnalysis;
  pairData?: PairData | null;
  cards?: string[];
  commander?: string;
  deckText?: string;
  sessionHistory?: SessionPoint[];
  onSave?: (deckName: string) => Promise<void>;
  onSwap?: (oldCard: string, newCard: string) => void;
  groupedCards?: Record<string, string[]> | null;
  typesLoading?: boolean;
  cardDataMap?: Map<string, ScryfallCardData>;
}

function SessionSparkline({ history }: { history: SessionPoint[] }) {
  const powers = history.map((h) => h.power);
  const min = Math.min(...powers);
  const max = Math.max(...powers);
  const range = max - min || 0.001;
  const W = 200,
    H = 36,
    PAD = 4;

  const points = history.map((h, i) => {
    const x = PAD + (i / (history.length - 1)) * (W - PAD * 2);
    // Lower power = stronger = render higher on chart.
    const y = PAD + ((h.power - min) / range) * (H - PAD * 2);
    return [x, y] as [number, number];
  });

  const last = powers[powers.length - 1];
  const first = powers[0];
  // Negative delta is good (power went down = deck improved).
  const delta = last - first;
  const color = delta < -0.0001 ? "#22c55e" : delta > 0.0001 ? "#ef4444" : "#6b7280";

  return (
    <div className="flex items-center gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="flex-1 h-9">
        <polyline
          points={points.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill={color} />
        ))}
      </svg>
      <div className="text-right text-xs font-mono shrink-0 space-y-0.5">
        <div className="flex items-center gap-1 justify-end">
          {delta < -0.0001 ? (
            <TrendingDown className="w-3 h-3 text-green-400" />
          ) : delta > 0.0001 ? (
            <TrendingUp className="w-3 h-3 text-red-400" />
          ) : null}
          <span style={{ color }}>{delta > 0 ? "+" : ""}{delta.toFixed(4)}</span>
        </div>
        <p className="text-text-muted">{history.length} swaps</p>
      </div>
    </div>
  );
}

export default function ResultsDashboard({
  results,
  pairData,
  cards,
  commander,
  deckText,
  sessionHistory,
  onSave,
  onSwap,
  groupedCards,
  typesLoading,
  cardDataMap,
}: ResultsDashboardProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [deckName, setDeckName] = useState("");
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const { percentile, totalDecks } = useCommanderPercentile(
    commander ?? "",
    results.averagePairPower
  );

  function openSaveDialog() {
    setDeckName(commander || "");
    setShowNameInput(true);
  }

  async function handleSave() {
    if (!onSave) return;
    setSaving(true);
    await onSave(deckName.trim() || commander || "Unnamed Deck");
    setSaving(false);
    setSaved(true);
    setShowNameInput(false);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleCopyLink() {
    if (!deckText) return;
    try {
      const encoded = btoa(unescape(encodeURIComponent(deckText)));
      const url = `${window.location.origin}/?deck=${encoded}`;
      navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-center gap-3">
        <PowerRankHero value={results.totalPowerRank} />
      </div>

      {/* Commander percentile */}
      {percentile !== null && totalDecks >= 3 && (
        <p className="text-center text-sm text-text-muted">
          Top{" "}
          <span className="text-accent font-semibold">{100 - percentile}%</span>
          {" "}of{" "}
          <span className="font-medium">{totalDecks}</span>{" "}
          {commander?.split(" / ")[0]} decks in the database
        </p>
      )}

      {/* Save + Share buttons */}
      {(onSave || deckText) && (
        <div className="flex justify-center gap-2 flex-wrap">
          {deckText && (
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer border ${
                linkCopied
                  ? "bg-green-500/20 text-green-400 border-green-500/40"
                  : "glass text-text-muted hover:text-text border-border"
              }`}
            >
              {linkCopied ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Link copied!
                </>
              ) : (
                <>
                  <Link className="w-4 h-4" />
                  Copy share link
                </>
              )}
            </button>
          )}
          {onSave && (
            <>
              {showNameInput ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    placeholder="Deck name..."
                    autoFocus
                    className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder-text-muted focus:outline-none focus:border-accent transition-colors w-56"
                  />
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-light text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setShowNameInput(false)}
                    className="p-2 text-text-muted hover:text-text transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={saved ? undefined : openSaveDialog}
                  disabled={saving}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                    saved
                      ? "bg-green-500/20 text-green-400 border border-green-500/40"
                      : "bg-accent hover:bg-accent-light text-white"
                  } disabled:opacity-50`}
                >
                  {saved ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Deck
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      )}

      <StatsGrid stats={results} />

      {/* Session progress sparkline */}
      {sessionHistory && sessionHistory.length >= 2 && (
        <div className="glass rounded-xl px-4 py-3">
          <p className="text-xs text-text-muted mb-2 uppercase tracking-wide">Session Progress</p>
          <SessionSparkline history={sessionHistory} />
        </div>
      )}

      {pairData && cards && onSwap && (
        <>
          <UpgradeSuggestions
            cards={cards}
            breakdown={results.cardBreakdown}
            pairData={pairData}
            onApplySwap={onSwap}
          />
          <SwapTester
            cards={cards}
            pairData={pairData}
            selectedCard={selectedCard}
            onClearSelection={() => setSelectedCard(null)}
            onConfirmSwap={(oldCard, newCard) => {
              onSwap(oldCard, newCard);
              setSelectedCard(null);
            }}
          />
        </>
      )}

      <CardBreakdownTable
        breakdown={results.cardBreakdown}
        selectedCard={selectedCard}
        onSelectCard={pairData ? setSelectedCard : undefined}
        groupedCards={groupedCards}
        typesLoading={typesLoading}
        cardDataMap={cardDataMap}
      />
    </div>
  );
}
