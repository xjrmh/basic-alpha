import { INDEX_SYMBOLS, TTL } from "@/lib/constants";
import { getOrSetCache } from "@/lib/cache";
import { getIndexConstituents, isFinnhubAccessDenied } from "@/lib/finnhub";
import { getWikipediaConstituents } from "@/lib/wiki-universe";
import { IndexScope } from "@/types/market";

const STATIC_FALLBACK: Record<"sp500" | "nasdaq100", string[]> = {
  sp500: [
    "AAPL",
    "MSFT",
    "AMZN",
    "GOOGL",
    "GOOG",
    "META",
    "NVDA",
    "TSLA",
    "BRK.B",
    "JPM",
    "V",
    "JNJ",
    "UNH",
    "XOM",
    "PG",
    "MA",
    "HD",
    "MRK",
    "AVGO",
    "PEP",
    "COST",
    "ABBV",
    "KO",
    "ADBE",
    "CRM",
    "BAC",
    "WMT",
    "MCD",
    "NFLX",
    "AMD",
    "TMO",
    "LIN",
    "CSCO",
    "ACN",
    "DHR",
    "ORCL",
    "TXN",
    "ABT",
    "QCOM",
    "CMCSA"
  ],
  nasdaq100: [
    "AAPL",
    "MSFT",
    "AMZN",
    "GOOGL",
    "GOOG",
    "META",
    "NVDA",
    "TSLA",
    "AVGO",
    "COST",
    "NFLX",
    "AMD",
    "ADBE",
    "CSCO",
    "PEP",
    "CMCSA",
    "TMUS",
    "QCOM",
    "TXN",
    "AMGN",
    "INTU",
    "INTC",
    "ISRG",
    "BKNG",
    "GILD",
    "ADP",
    "LRCX",
    "REGN",
    "PANW",
    "SNPS",
    "KLAC",
    "VRTX",
    "MNST",
    "MELI",
    "ASML",
    "MU",
    "PDD",
    "CDNS",
    "CTAS",
    "PYPL"
  ]
};

export type UniverseData = {
  symbols: string[];
  sources: string[];
};

async function loadSingleUniverse(scope: "sp500" | "nasdaq100"): Promise<UniverseData> {
  const indexSymbol = scope === "sp500" ? INDEX_SYMBOLS.sp500 : INDEX_SYMBOLS.nasdaq100;

  try {
    const symbols = await getIndexConstituents(indexSymbol);
    if (symbols.length > 0) {
      return {
        symbols,
        sources: ["Finnhub index/constituents"]
      };
    }
  } catch (error) {
    if (!isFinnhubAccessDenied(error)) {
      throw error;
    }
  }

  try {
    const wikiSymbols = await getWikipediaConstituents(scope);
    if (wikiSymbols.length > 0) {
      return {
        symbols: wikiSymbols,
        sources: ["Wikipedia constituents fallback"]
      };
    }
  } catch {
    // If Wikipedia fallback fails, use the built-in list below.
  }

  return {
    symbols: STATIC_FALLBACK[scope],
    sources: ["Built-in fallback universe"]
  };
}

export async function resolveUniverse(scope: IndexScope): Promise<UniverseData> {
  const cacheKey = `universe:${scope}`;

  return getOrSetCache(cacheKey, TTL.universeMs, async () => {
    if (scope === "sp500") {
      return loadSingleUniverse("sp500");
    }

    if (scope === "nasdaq100") {
      return loadSingleUniverse("nasdaq100");
    }

    const [sp500, nasdaq100] = await Promise.all([
      loadSingleUniverse("sp500"),
      loadSingleUniverse("nasdaq100")
    ]);

    return {
      symbols: [...new Set([...sp500.symbols, ...nasdaq100.symbols])].sort(),
      sources: [...new Set([...sp500.sources, ...nasdaq100.sources])]
    };
  });
}
