import { useState, useRef, useMemo } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Header from "./components/Header";
import DeckInput from "./components/DeckInput";
import ResultsDashboard from "./components/ResultsDashboard";
import DecksSidebar from "./components/DecksSidebar";
import AddDataPage from "./pages/AddDataPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import DecksPage from "./pages/DecksPage";
import DeckViewPage from "./pages/DeckViewPage";
import FeedbackButton from "./components/FeedbackButton";
import { usePairData } from "./hooks/usePairData";
import { useHistory } from "./hooks/useHistory";
import { useCustomPairs } from "./hooks/useCustomPairs";
import { useDecklists } from "./hooks/useDecklists";
import { useAuth } from "./context/AuthContext";
import { analyzeDeck } from "./lib/deckAnalyzer";
import { mergePairData } from "./lib/mergePairData";
import type { DeckAnalysis, HistoryEntry } from "./types";
import type { Decklist } from "./hooks/useDecklists";

const ADMIN_EMAILS = ["oromier@gmail.com"];

export default function App() {
  const { user } = useAuth();
  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email ?? "");

  const { pairData, loading, error, replacePairData } = usePairData();
  const [results, setResults] = useState<DeckAnalysis | null>(null);
  const [currentCards, setCurrentCards] = useState<string[]>([]);
  const [currentCommander, setCurrentCommander] = useState("");
  const [deckText, setDeckText] = useState("");
  const resultsRef = useRef<HTMLDivElement>(null);
  const { history, addEntry, clearHistory } = useHistory();
  const { customPairs, addPair, addPairsBulk, removePair, clearCustomPairs } =
    useCustomPairs();
  const { decklists, loading: decksLoading, saveDeck, deleteDeck } =
    useDecklists(user?.id);

  const customPairCount = Object.keys(customPairs).length;

  const mergedData = useMemo(
    () => (pairData ? mergePairData(pairData, customPairs) : null),
    [pairData, customPairs]
  );

  function handleAnalyze(cards: string[], commander: string) {
    if (!mergedData) return;
    const analysis = analyzeDeck(cards, mergedData);
    setResults(analysis);
    setCurrentCards(cards);
    setCurrentCommander(commander);
    addEntry(analysis, commander, cards);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  async function handleSaveDeck() {
    if (!results || !user) return;
    await saveDeck(currentCommander, currentCards, results);
  }

  function handleHistorySelect(entry: HistoryEntry) {
    if (!entry.cards) return;
    const text = entry.cards.map((c) => "1 " + c).join("\n");
    setDeckText(text);
    handleAnalyze(entry.cards, entry.commander ?? "");
  }

  function handleDeckSelect(deck: Decklist) {
    if (!deck.cards || !mergedData) return;
    const text = deck.cards.map((c) => "1 " + c).join("\n");
    setDeckText(text);
    const analysis = analyzeDeck(deck.cards, mergedData);
    setResults(analysis);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
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
      <Header customPairCount={customPairCount} isAdmin={isAdmin} />
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
                          <ResultsDashboard
                            results={results}
                            onSave={user ? handleSaveDeck : undefined}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
                {user ? (
                  <DecksSidebar
                    decklists={decklists}
                    loading={decksLoading}
                    onSelect={handleDeckSelect}
                    onDelete={deleteDeck}
                  />
                ) : (
                  <DecksSidebar
                    history={history}
                    onClearHistory={clearHistory}
                    onSelectHistory={handleHistorySelect}
                  />
                )}
              </div>
            </main>
          }
        />
        <Route
          path="/add"
          element={
            isAdmin ? (
              <AddDataPage
                customPairs={customPairs}
                onAddPair={addPair}
                onAddPairsBulk={addPairsBulk}
                onRemovePair={removePair}
                onClearAll={clearCustomPairs}
                onReplacePairData={replacePairData}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/decks"
          element={<DecksPage />}
        />
        <Route
          path="/decks/:id"
          element={<DeckViewPage pairData={mergedData} />}
        />
        <Route
          path="/leaderboard"
          element={<LeaderboardPage pairData={mergedData} />}
        />
      </Routes>
      <FeedbackButton />
    </div>
  );
}
