import type { PairData, DeckAnalysis, SwapResult } from "../types";

const DEFAULT_POWER = 5.72;

// Normalize smart/curly quotes to straight ASCII equivalents so deck list
// card names match the pair data regardless of the export source (e.g. Moxfield).
function normalizeCardName(name: string): string {
  return name
    .replace(/[\u2018\u2019\u201A\u201B\u02BC]/g, "'") // curly single quotes / apostrophes → '
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"');       // curly double quotes → "
}

export function parseDeckList(text: string): string[] {
  const lines = text.split("\n");
  const cards: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) continue;

    // Parse quantity and name (e.g. "10 Mountain", "1x Sol Ring", or just "Sol Ring")
    const match = line.match(/^(\d+)x?\s+(.+)$/i);
    const qty = match ? parseInt(match[1], 10) : 1;
    const rawName = match ? match[2].trim() : line.trim();

    // Strip Moxfield-style set code and collector number suffix: "Card Name (SET) 123" or "Card Name (SET) 123 *F*"
    const stripped = rawName.replace(/\s*\([A-Za-z0-9]{2,6}\)\s*\d+.*$/, "").trim();

    // Normalize double-faced cards: keep only the front face name
    // e.g. "Birgi, God of Storytelling // Harnfel, Horn of Bounty" → "Birgi, God of Storytelling"
    // also handles single-slash format: "Aclazotz, Deepest Betrayal / Temple of the Dead" → "Aclazotz, Deepest Betrayal"
    const name = stripped.includes(" // ")
      ? stripped.split(" // ")[0].trim()
      : stripped.includes(" / ")
      ? stripped.split(" / ")[0].trim()
      : stripped;

    const normalized = normalizeCardName(name);
    if (normalized) {
      for (let i = 0; i < qty; i++) {
        cards.push(normalized);
      }
    }
  }

  return cards;
}

export function generatePairs(cards: string[]): string[] {
  const pairs: string[] = [];
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const [a, b] = [cards[i], cards[j]].sort();
      pairs.push(`${a}|||${b}`);
    }
  }
  return pairs;
}

export function analyzeDeck(cards: string[], pairData: PairData): DeckAnalysis {
  // Build quantity map for unique cards
  const qtyMap: Record<string, number> = {};
  for (const card of cards) {
    qtyMap[card] = (qtyMap[card] || 0) + 1;
  }
  const uniqueCards = Object.keys(qtyMap);

  // Generate weighted pairs from unique cards + quantities
  // For two different cards A (qA copies) and B (qB copies): qA * qB pair instances
  // For self-pair A with itself (qA copies): C(qA, 2) = qA*(qA-1)/2 pair instances
  let totalPower = 0;
  let pairsFound = 0;
  let pairsMissing = 0;

  const cardStats: Record<string, { power: number; found: number; missing: number }> = {};
  for (const name of uniqueCards) {
    cardStats[name] = { power: 0, found: 0, missing: 0 };
  }

  for (let i = 0; i < uniqueCards.length; i++) {
    for (let j = i; j < uniqueCards.length; j++) {
      const cardA = uniqueCards[i];
      const cardB = uniqueCards[j];

      // How many pair instances?
      let count: number;
      if (i === j) {
        // Self-pair: C(qty, 2)
        const q = qtyMap[cardA];
        count = (q * (q - 1)) / 2;
        if (count === 0) continue;
      } else {
        count = qtyMap[cardA] * qtyMap[cardB];
      }

      const [a, b] = [cardA, cardB].sort();
      const key = `${a}|||${b}`;
      const data = pairData[key];
      const power = data ? data.p : DEFAULT_POWER;
      const pairPower = power * count;

      totalPower += pairPower;

      if (data) {
        pairsFound += count;
      } else {
        pairsMissing += count;
      }

      // Attribute to both cards
      cardStats[a].power += pairPower;
      if (data) cardStats[a].found += count;
      else cardStats[a].missing += count;

      if (a !== b) {
        cardStats[b].power += pairPower;
        if (data) cardStats[b].found += count;
        else cardStats[b].missing += count;
      }
    }
  }

  const totalPairs = pairsFound + pairsMissing;
  const averagePairPower = totalPairs > 0 ? totalPower / totalPairs : 0;

  const cardBreakdown = uniqueCards
    .map((name) => {
      const s = cardStats[name];
      const totalCardPairs = s.found + s.missing;
      return {
        name,
        quantity: qtyMap[name],
        contribution: s.power,
        pairsFound: s.found,
        pairsMissing: s.missing,
        avgPairPower: totalCardPairs > 0 ? s.power / totalCardPairs : 0,
      };
    })
    .sort((a, b) => b.avgPairPower - a.avgPairPower);

  return {
    totalPowerRank: totalPower,
    totalPairs,
    pairsFound,
    pairsMissing,
    averagePairPower,
    cardBreakdown,
  };
}

export function simulateSwap(
  cards: string[],
  oldCard: string,
  newCard: string,
  pairData: PairData
): SwapResult {
  const oldAnalysis = analyzeDeck(cards, pairData);
  const newCards = cards.map((c) => (c === oldCard ? newCard : c));
  const newAnalysis = analyzeDeck(newCards, pairData);

  return {
    oldCard,
    newCard,
    oldPower: oldAnalysis.averagePairPower,
    newPower: newAnalysis.averagePairPower,
    diff: newAnalysis.averagePairPower - oldAnalysis.averagePairPower,
  };
}
