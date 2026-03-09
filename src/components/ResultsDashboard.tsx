import { useState } from "react";
import { Save, CheckCircle, X } from "lucide-react";
import type { DeckAnalysis, PairData } from "../types";
import PowerRankHero from "./PowerRankHero";
import StatsGrid from "./StatsGrid";
import CardBreakdownTable from "./CardBreakdownTable";
import SwapTester from "./SwapTester";

interface ResultsDashboardProps {
  results: DeckAnalysis;
  pairData?: PairData | null;
  cards?: string[];
  commander?: string;
  onSave?: (deckName: string) => Promise<void>;
  onSwap?: (oldCard: string, newCard: string) => void;
}

export default function ResultsDashboard({ results, pairData, cards, commander, onSave, onSwap }: ResultsDashboardProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [deckName, setDeckName] = useState("");
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

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

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-center gap-3">
        <PowerRankHero value={results.totalPowerRank} />
      </div>
      {onSave && (
        <div className="flex justify-center">
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
        </div>
      )}
      <StatsGrid stats={results} />
      {pairData && cards && onSwap && (
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
      )}
      <CardBreakdownTable
        breakdown={results.cardBreakdown}
        selectedCard={selectedCard}
        onSelectCard={pairData ? setSelectedCard : undefined}
      />
    </div>
  );
}
