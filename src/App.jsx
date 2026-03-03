import { useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import Header from "./components/Header";
import DeckInput from "./components/DeckInput";
import ResultsDashboard from "./components/ResultsDashboard";
import HistorySidebar from "./components/HistorySidebar";
import { usePairData } from "./hooks/usePairData";
import { useHistory } from "./hooks/useHistory";
import { analyzeDeck } from "./lib/deckAnalyzer";

export default function App() {
  const { pairData, loading, error } = usePairData();
  const [results, setResults] = useState(null);
  const resultsRef = useRef(null);
  const { history, addEntry, clearHistory } = useHistory();

  function handleAnalyze(cards) {
    const analysis = analyzeDeck(cards, pairData);
    setResults(analysis);
    addEntry(analysis);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-xl p-8 text-center max-w-md">
          <p className="text-red-400 font-semibold mb-2">Failed to load card data</p>
          <p className="text-sm text-text-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-6">
          <div className="flex-1 min-w-0 space-y-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
                <p className="text-text-muted text-sm">Loading 87,721 card pairs...</p>
              </div>
            ) : (
              <>
                <DeckInput onAnalyze={handleAnalyze} disabled={loading} />
                {results && (
                  <div ref={resultsRef}>
                    <ResultsDashboard results={results} />
                  </div>
                )}
              </>
            )}
          </div>
          <HistorySidebar history={history} onClear={clearHistory} />
        </div>
      </main>
    </div>
  );
}
