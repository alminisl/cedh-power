import { useState, useRef, useMemo } from "react";
import { Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Header from "./components/Header";
import DeckInput from "./components/DeckInput";
import ResultsDashboard from "./components/ResultsDashboard";
import HistorySidebar from "./components/HistorySidebar";
import AddDataPage from "./pages/AddDataPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import { usePairData } from "./hooks/usePairData";
import { useHistory } from "./hooks/useHistory";
import { useCustomPairs } from "./hooks/useCustomPairs";
import { analyzeDeck } from "./lib/deckAnalyzer";
import { mergePairData } from "./lib/mergePairData";

export default function App() {
  const { pairData, loading, error } = usePairData();
  const [results, setResults] = useState(null);
  const [deckText, setDeckText] = useState("");
  const resultsRef = useRef(null);
  const { history, addEntry, clearHistory } = useHistory();
  const { customPairs, addPair, addPairsBulk, removePair, clearCustomPairs } =
    useCustomPairs();

  const customPairCount = Object.keys(customPairs).length;

  const mergedData = useMemo(
    () => (pairData ? mergePairData(pairData, customPairs) : null),
    [pairData, customPairs]
  );

  function handleAnalyze(cards, commander) {
    const analysis = analyzeDeck(cards, mergedData);
    setResults(analysis);
    addEntry(analysis, commander, cards);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function handleHistorySelect(entry) {
    if (!entry.cards) return;
    const text = entry.cards.map((c) => "1 " + c).join("\n");
    setDeckText(text);
    handleAnalyze(entry.cards, entry.commander);
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-xl p-8 text-center max-w-md">
          <p className="text-red-400 font-semibold mb-2">
            Failed to load card data
          </p>
          <p className="text-sm text-text-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header customPairCount={customPairCount} />
      <Routes>
        <Route
          path="/"
          element={
            <main className="max-w-7xl mx-auto px-4 py-8">
              <div className="flex gap-6">
                <div className="flex-1 min-w-0 space-y-8">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                      <Loader2 className="w-8 h-8 text-accent animate-spin" />
                      <p className="text-text-muted text-sm">
                        Loading 87,721 card pairs...
                      </p>
                    </div>
                  ) : (
                    <>
                      <DeckInput onAnalyze={handleAnalyze} disabled={loading} text={deckText} onTextChange={setDeckText} />
                      {results && (
                        <div ref={resultsRef}>
                          <ResultsDashboard results={results} />
                        </div>
                      )}
                    </>
                  )}
                </div>
                <HistorySidebar history={history} onClear={clearHistory} onSelect={handleHistorySelect} />
              </div>
            </main>
          }
        />
        <Route
          path="/add"
          element={
            <AddDataPage
              customPairs={customPairs}
              onAddPair={addPair}
              onAddPairsBulk={addPairsBulk}
              onRemovePair={removePair}
              onClearAll={clearCustomPairs}
            />
          }
        />
        <Route
          path="/leaderboard"
          element={<LeaderboardPage pairData={mergedData} />}
        />
      </Routes>
    </div>
  );
}
