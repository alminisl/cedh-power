export interface ScryfallCardData {
  name: string;
  mana_cost?: string;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  image_uris?: { normal: string };
  card_faces?: Array<{
    name?: string;
    mana_cost?: string;
    type_line?: string;
    oracle_text?: string;
    power?: string;
    toughness?: string;
    image_uris?: { normal: string };
  }>;
  set_name: string;
  set: string;
  collector_number: string;
  rarity: string;
  prices: { usd?: string; usd_foil?: string };
}

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

export interface SwapResult {
  oldCard: string;
  newCard: string;
  oldPower: number;
  newPower: number;
  diff: number;
}

export interface CardStat {
  name: string;
  pairs: number;
  totalPower: number;
  totalConf: number;
  totalLogMult: number;
  avgPower: number;
}

export interface ParquetVersion {
  r2_key: string;
  size: number;
  uploaded: string;
  original_filename: string | null;
  pair_count: number;
  card_count: number;
  uploaded_by: string | null;
}
