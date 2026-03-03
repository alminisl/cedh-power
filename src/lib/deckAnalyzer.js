const DEFAULT_POWER = 5.72;

export function parseDeckList(text) {
  const lines = text.split("\n");
  const cards = new Set();

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) continue;

    // Strip leading quantity (e.g. "1 Sol Ring" or "1x Sol Ring")
    const match = line.match(/^\d+x?\s+(.+)$/i);
    const name = match ? match[1].trim() : line.trim();
    if (name) cards.add(name);
  }

  return [...cards];
}

export function generatePairs(cards) {
  const pairs = [];
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const [a, b] = [cards[i], cards[j]].sort();
      pairs.push(`${a}|||${b}`);
    }
  }
  return pairs;
}

export function analyzeDeck(cards, pairData) {
  const pairs = generatePairs(cards);
  let totalPower = 0;
  let pairsFound = 0;
  let pairsMissing = 0;

  // Track per-card contributions
  const cardStats = {};
  for (const card of cards) {
    cardStats[card] = { power: 0, found: 0, missing: 0 };
  }

  for (const key of pairs) {
    const data = pairData[key];
    const power = data ? data.p : DEFAULT_POWER;
    totalPower += power;

    if (data) {
      pairsFound++;
    } else {
      pairsMissing++;
    }

    // Attribute to both cards in the pair
    const [a, b] = key.split("|||");
    if (cardStats[a]) {
      cardStats[a].power += power;
      if (data) cardStats[a].found++;
      else cardStats[a].missing++;
    }
    if (cardStats[b]) {
      cardStats[b].power += power;
      if (data) cardStats[b].found++;
      else cardStats[b].missing++;
    }
  }

  const totalPairs = pairs.length;
  const averagePairPower = totalPairs > 0 ? totalPower / totalPairs : 0;

  const cardBreakdown = cards
    .map((name) => {
      const s = cardStats[name];
      const totalCardPairs = s.found + s.missing;
      return {
        name,
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
