export type IndexScope = "sp500" | "nasdaq100" | "both";

export type MacroType = "FOMC" | "CPI" | "NFP";

export type DatePreset = "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y";

export type DashboardTab = "earnings" | "price" | "correlation" | "lagged";

export type EarningsHour = "bmo" | "amc" | "dmh";

export type Candle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type EarningsItem = {
  symbol: string;
  companyName: string;
  date: string;
  hour: EarningsHour;
  epsEstimate?: number;
  revenueEstimate?: number;
  expectedMovePct: number;
  expectedMoveAbs: number;
};

export type CorrCell = {
  x: string;
  y: string;
  value: number;
};

export type LagPair = {
  leader: string;
  follower: string;
  corr: number;
};

export type LagResult = {
  lagDays: number;
  matrix: CorrCell[];
  topLeadLagPairs: LagPair[];
};

export type MacroEvent = {
  date: string;
  type: MacroType;
  title: string;
  importance: "high" | "medium";
  source: string;
};

export type UniverseResponse = {
  symbols: string[];
  asOf: string;
  sources: string[];
};

export type PricesResponse = {
  symbol: string;
  candles: Candle[];
};

export type EarningsResponse = {
  items: EarningsItem[];
  partial?: boolean;
  warning?: string;
};

export type CorrelationResponse = {
  matrix: CorrCell[];
  observations: number;
  droppedSymbols: string[];
};

export type LaggedCorrelationResponse = {
  results: LagResult[];
  observations: number;
  droppedSymbols: string[];
};
