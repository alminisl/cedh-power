export interface PairStats {
  p: number;
  w?: number;
  c?: number;
  l?: number;
}

export type PairData = Record<string, PairStats>;

export interface CardBreakdownItem {
  name: string;
  quantity?: number;
  contribution: number;
  pairsFound: number;
  pairsMissing: number;
  avgPairPower: number;
}

export interface DeckAnalysis {
  totalPowerRank: number;
  totalPairs: number;
  pairsFound: number;
  pairsMissing: number;
  averagePairPower: number;
  cardBreakdown: CardBreakdownItem[];
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  cardCount: number;
  averagePairPower: number;
  firstCards: string[];
  commander: string | null;
  cards: string[];
}

export interface CardStat {
  name: string;
  pairs: number;
  totalPower: number;
  totalConf: number;
  totalLogMult: number;
  avgPower: number;
}
