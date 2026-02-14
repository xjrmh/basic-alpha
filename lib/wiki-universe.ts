import { load } from "cheerio";

type IndexKey = "sp500" | "nasdaq100";

const WIKI_URLS: Record<IndexKey, string> = {
  sp500: "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies",
  nasdaq100: "https://en.wikipedia.org/wiki/Nasdaq-100"
};

function normalizeSymbol(raw: string): string | null {
  const cleaned = raw
    .trim()
    .replace(/[\u200B\u00A0]/g, "")
    .replace(/\s+/g, " ")
    .split(" ")[0]
    .toUpperCase();

  if (!/^[A-Z0-9.-]{1,10}$/.test(cleaned)) {
    return null;
  }

  return cleaned;
}

function extractSymbolsFromHtml(html: string): string[] {
  const $ = load(html);

  const candidates: { score: number; symbols: string[] }[] = [];

  $("table.wikitable").each((_, table) => {
    const headers = $(table)
      .find("tr")
      .first()
      .find("th")
      .map((__, th) => $(th).text().trim().toLowerCase())
      .get();

    const hasTickerColumn = headers.some(
      (header) => header.includes("ticker") || header.includes("symbol")
    );

    if (!hasTickerColumn) {
      return;
    }

    const hasNameColumn = headers.some(
      (header) => header.includes("company") || header.includes("security")
    );

    const symbols: string[] = [];

    $(table)
      .find("tbody tr")
      .each((__, row) => {
        const firstCell = $(row).find("td").first();
        if (!firstCell.length) {
          return;
        }

        const normalized = normalizeSymbol(firstCell.text());
        if (normalized) {
          symbols.push(normalized);
        }
      });

    const unique = [...new Set(symbols)];
    if (!unique.length) {
      return;
    }

    let score = unique.length;
    if (hasNameColumn) {
      score += 20;
    }

    candidates.push({ score, symbols: unique });
  });

  if (!candidates.length) {
    return [];
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].symbols;
}

export async function getWikipediaConstituents(index: IndexKey): Promise<string[]> {
  const response = await fetch(WIKI_URLS[index], {
    cache: "no-store",
    headers: {
      "User-Agent": "BasicAlpha/1.0 (constituent fallback)"
    }
  });

  if (!response.ok) {
    throw new Error(`Wikipedia fetch failed (${response.status})`);
  }

  const html = await response.text();
  return extractSymbolsFromHtml(html);
}
