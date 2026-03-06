import { useState } from "react";
import { Save, CheckCircle } from "lucide-react";
import type { DeckAnalysis, PairData } from "../types";
import PowerRankHero from "./PowerRankHero";
import StatsGrid from "./StatsGrid";
import CardBreakdownTable from "./CardBreakdownTable";
import SwapTester from "./SwapTester";

interface ResultsDashboardProps {
  results: DeckAnalysis;
  pairData?: PairData | null;
  cards?: string[];
  onSave?: () => Promise<void>;
  onSwap?: (oldCard: string, newCard: string) => void;
}

export default function ResultsDashboard({ results, pairData, cards, onSave, onSwap }: ResultsDashboardProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  async function handleSave() {
    if (!onSave) return;
    setSaving(true);
    await onSave();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-center gap-3">
        <PowerRankHero value={results.totalPowerRank} />
      </div>
      {onSave && (
        <div className="flex justify-center">
          <button
            onClick={handleSave}
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
                {saving ? "Saving..." : "Save Deck"}
              </>
            )}
          </button>
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
