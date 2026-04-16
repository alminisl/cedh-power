import { useState, useMemo } from "react";
import { GitCompare, Swords } from "lucide-react";
import { analyzeDeck } from "../lib/deckAnalyzer";
import DeckInput from "../components/DeckInput";
import ResultsDashboard from "../components/ResultsDashboard";
import type { PairData, DeckAnalysis } from "../types";

interface ComparePageProps {
  pairData: PairData | null;
}

export default function ComparePage({ pairData }: ComparePageProps) {
  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");
  const [cardsA, setCardsA] = useState<string[]>([]);
  const [cardsB, setCardsB] = useState<string[]>([]);
  const [commanderA, setCommanderA] = useState("");
  const [commanderB, setCommanderB] = useState("");

  const analysisA = useMemo<DeckAnalysis | null>(
    () => (cardsA.length && pairData ? analyzeDeck(cardsA, pairData) : null),
    [cardsA, pairData]
  );
  const analysisB = useMemo<DeckAnalysis | null>(
    () => (cardsB.length && pairData ? analyzeDeck(cardsB, pairData) : null),
    [cardsB, pairData]
  );

  const winner = useMemo(() => {
    if (!analysisA || !analysisB) return null;
    const diff = analysisA.averagePairPower - analysisB.averagePairPower;
    if (diff < -0.0001) return "A"; // A is lower → A is stronger
    if (diff > 0.0001) return "B";
    return "tie";
  }, [analysisA, analysisB]);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <GitCompare className="w-6 h-6 text-accent" />
        <h1 className="text-2xl font-bold">Deck Comparison</h1>
        <span className="text-sm text-text-muted">Analyze two decks side by side</span>
      </div>

      {winner && (
        <div className="glass rounded-xl p-4 text-center border border-accent/30">
          {winner === "tie" ? (
            <p className="text-sm font-semibold text-text-muted">
              These decks are essentially equal in power.
            </p>
          ) : (
            <p className="text-sm font-semibold">
              <span className="text-accent">Deck {winner}</span>
              {commanderA && commanderB && (
                <span className="text-text-muted font-normal">
                  {" "}({winner === "A" ? commanderA : commanderB})
                </span>
              )}{" "}
              is stronger by{" "}
              <span className="font-mono text-accent">
                {Math.abs(analysisA!.averagePairPower - analysisB!.averagePairPower).toFixed(4)}
              </span>{" "}
              avg pair power
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deck A */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-accent" />
            <h2 className="font-semibold">
              Deck A
              {commanderA && (
                <span className="text-text-muted font-normal text-sm"> — {commanderA}</span>
              )}
            </h2>
            {winner === "A" && (
              <span className="ml-auto text-xs font-semibold text-green-400 bg-green-400/10 px-2 py-0.5 rounded">
                Stronger
              </span>
            )}
          </div>
          <DeckInput
            onAnalyze={(cards, commander) => {
              setCardsA(cards);
              setCommanderA(commander);
            }}
            disabled={!pairData}
            text={textA}
            onTextChange={setTextA}
          />
          {analysisA && (
            <ResultsDashboard results={analysisA} commander={commanderA} />
          )}
        </div>

        {/* Deck B */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-accent" />
            <h2 className="font-semibold">
              Deck B
              {commanderB && (
                <span className="text-text-muted font-normal text-sm"> — {commanderB}</span>
              )}
            </h2>
            {winner === "B" && (
              <span className="ml-auto text-xs font-semibold text-green-400 bg-green-400/10 px-2 py-0.5 rounded">
                Stronger
              </span>
            )}
          </div>
          <DeckInput
            onAnalyze={(cards, commander) => {
              setCardsB(cards);
              setCommanderB(commander);
            }}
            disabled={!pairData}
            text={textB}
            onTextChange={setTextB}
          />
          {analysisB && (
            <ResultsDashboard results={analysisB} commander={commanderB} />
          )}
        </div>
      </div>
    </main>
  );
}
