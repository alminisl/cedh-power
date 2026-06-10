import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Header from "./components/Header";
import DeckInput from "./components/DeckInput";
import ResultsDashboard, { type SessionPoint } from "./components/ResultsDashboard";
import DecksSidebar from "./components/DecksSidebar";
import AddDataPage from "./views/AddDataPage";
import LeaderboardPage from "./views/LeaderboardPage";
import DecksPage from "./views/DecksPage";
import DeckViewPage from "./views/DeckViewPage";
import ComparePage from "./views/ComparePage";
import PrimersPage from "./views/PrimersPage";
import FeedbackButton from "./components/FeedbackButton";
import Footer from "./components/Footer";
import AboutPage from "./views/AboutPage";
import { usePairData } from "./hooks/usePairData";
import { useHistory } from "./hooks/useHistory";
import { useCustomPairs } from "./hooks/useCustomPairs";
import { useDecklists } from "./hooks/useDecklists";
import { useAuth } from "./context/AuthContext";
import { analyzeDeck, parseDeckList } from "./lib/deckAnalyzer";
import { mergePairData } from "./lib/mergePairData";
import { useCardTypes } from "./hooks/useCardTypes";
import type { DeckAnalysis, HistoryEntry } from "./types";
import type { Decklist } from "./hooks/useDecklists";

const ADMIN_EMAILS = ["oromier@gmail.com", "mansbredelius@gmail.com"];

export default function App() {
  const { user } = useAuth();
  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email ?? "");

  const { pairData, loading, error, replacePairData } = usePairData();
  const [results, setResults] = useState<DeckAnalysis | null>(null);
  const [currentCards, setCurrentCards] = useState<string[]>([]);
  const [currentCommander, setCurrentCommander] = useState("");
  const [deckText, setDeckText] = useState("");
  const [sessionHistory, setSessionHistory] = useState<SessionPoint[]>([]);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { history, addEntry, clearHistory } = useHistory();
  const { customPairs, addPair, addPairsBulk, removePair, clearCustomPairs } =
    useCustomPairs();
  const { decklists, loading: decksLoading, saveDeck, deleteDeck } =
    useDecklists(user?.id);

  const { cardTypes, typesLoading, groupedCards } = useCardTypes(currentCards, currentCommander);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const customPairCount = Object.keys(customPairs).length;

  const mergedData = useMemo(
    () => (pairData ? mergePairData(pairData, customPairs) : null),
    [pairData, customPairs]
  );

  // Auto-analyze deck from ?deck= URL param once pair data is ready.
  useEffect(() => {
    if (!mergedData) return;
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("deck");
    if (!encoded) return;
    try {
      const text = decodeURIComponent(escape(atob(encoded)));
      const cards = parseDeckList(text);
      if (cards.length === 0) return;
      // Remove the param from the URL without triggering a navigation.
      const url = new URL(window.location.href);
      url.searchParams.delete("deck");
      window.history.replaceState({}, "", url.toString());
      setDeckText(text);
      const analysis = analyzeDeck(cards, mergedData);
      setResults(analysis);
      setCurrentCards(cards);
      setCurrentCommander(cards[0] ?? "");
      setSessionHistory([{ label: "Shared deck", power: analysis.averagePairPower }]);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      // Invalid encoding — ignore.
    }
    // We only want this to run once when mergedData first becomes available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!mergedData]);

  function handleAnalyze(cards: string[], commander: string) {
    if (!mergedData) return;
    const analysis = analyzeDeck(cards, mergedData);
    setResults(analysis);
    setCurrentCards(cards);
    setCurrentCommander(commander);
    setSessionHistory([{ label: "Initial", power: analysis.averagePairPower }]);
    addEntry(analysis, commander, cards);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  async function handleSaveDeck(deckName: string) {
    if (!results || !user) return;
    await saveDeck(currentCommander, currentCards, results, deckName);
  }

  function handleHistorySelect(entry: HistoryEntry) {
    if (!entry.cards) return;
    const text = entry.cards.map((c) => "1 " + c).join("\n");
    setDeckText(text);
    handleAnalyze(entry.cards, entry.commander ?? "");
  }

  function handleSwap(oldCard: string, newCard: string) {
    if (!mergedData) return;
    const newCards = currentCards.map((c) => (c === oldCard ? newCard : c));
    const newText = newCards.map((c) => "1 " + c).join("\n");
    setDeckText(newText);
    setCurrentCards(newCards);
    const analysis = analyzeDeck(newCards, mergedData);
    setResults(analysis);
    addEntry(analysis, currentCommander, newCards);
    setSessionHistory((prev) => [
      ...prev,
      { label: `-${oldCard} +${newCard}`, power: analysis.averagePairPower },
    ]);
  }

  function handleDeckSelect(deck: Decklist) {
    if (!deck.cards || !mergedData) return;
    const text = deck.cards.map((c) => "1 " + c).join("\n");
    setDeckText(text);
    setCurrentCards(deck.cards);
    setCurrentCommander(deck.commander ?? "");
    const analysis = analyzeDeck(deck.cards, mergedData);
    setResults(analysis);
    setSessionHistory([{ label: "Loaded deck", power: analysis.averagePairPower }]);
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
    <div className="min-h-screen flex flex-col">
      {typesLoading && (
        <div className="fixed top-0 left-0 right-0 z-50 h-0.5 overflow-hidden bg-accent/10 pointer-events-none">
          <div
            className="absolute h-full w-1/3 bg-accent rounded-full"
            style={{ animation: "loading-bar 1.5s ease-in-out infinite" }}
          />
        </div>
      )}
      <Header customPairCount={customPairCount} isAdmin={isAdmin} onToggleSidebar={toggleSidebar} />
      <div className="flex-1">
        <Routes>
          <Route
            path="/"
            element={
              <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex gap-3">
                  <div className="flex-1 min-w-0 space-y-8">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <Loader2 className="w-8 h-8 text-accent animate-spin" />
                        <p className="text-text-muted text-sm">Loading 87,721 card pairs...</p>
                      </div>
                    ) : (
                      <>
                        <DeckInput
                          onAnalyze={handleAnalyze}
                          disabled={loading}
                          text={deckText}
                          onTextChange={setDeckText}
                        />
                        {results && (
                          <div ref={resultsRef}>
                            <ResultsDashboard
                              results={results}
                              pairData={mergedData}
                              cards={currentCards}
                              commander={currentCommander}
                              deckText={deckText}
                              sessionHistory={sessionHistory}
                              onSave={user ? handleSaveDeck : undefined}
                              onSwap={handleSwap}
                              groupedCards={groupedCards}
                              typesLoading={typesLoading}
                              cardDataMap={cardTypes}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Desktop sidebar */}
                  <div className="hidden lg:block">
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

                  {/* Mobile sidebar overlay */}
                  {sidebarOpen && (
                    <div className="fixed inset-0 z-40 lg:hidden">
                      <div className="absolute inset-0 bg-black/60" onClick={closeSidebar} />
                      <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-bg overflow-y-auto p-4 pt-20">
                        {user ? (
                          <DecksSidebar
                            decklists={decklists}
                            loading={decksLoading}
                            onSelect={(deck) => { handleDeckSelect(deck); closeSidebar(); }}
                            onDelete={deleteDeck}
                          />
                        ) : (
                          <DecksSidebar
                            history={history}
                            onClearHistory={clearHistory}
                            onSelectHistory={(entry) => { handleHistorySelect(entry); closeSidebar(); }}
                          />
                        )}
                      </div>
                    </div>
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
                  pairData={pairData}
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
          <Route path="/decks" element={<DecksPage />} />
          <Route path="/decks/:id" element={<DeckViewPage pairData={mergedData} />} />
          <Route path="/leaderboard" element={<LeaderboardPage pairData={mergedData} />} />
          <Route path="/compare" element={<ComparePage pairData={mergedData} />} />
          <Route path="/primers" element={<PrimersPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </div>
      <Footer />
      <FeedbackButton />
    </div>
  );
}
