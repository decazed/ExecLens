import type { LanguageDocumentSymbol } from "./types.js";

export function getFunctionSymbolUnderCursor(
  symbols: LanguageDocumentSymbol[],
  cursorOffset: number
): LanguageDocumentSymbol | null {
  const candidates = flattenDocumentSymbols(symbols).filter(
    (symbol) =>
      (symbol.kind === "function" || symbol.kind === "method" || symbol.kind === "constructor") &&
      symbol.rangeStart <= cursorOffset &&
      cursorOffset <= symbol.rangeEnd
  );

  if (candidates.length === 0) {
    return null;
  }

  let best: LanguageDocumentSymbol | null = null;
  for (const candidate of candidates) {
    if (!best || symbolRangeSize(candidate) < symbolRangeSize(best)) {
      best = candidate;
    }
  }

  return best;
}

function flattenDocumentSymbols(symbols: LanguageDocumentSymbol[]): LanguageDocumentSymbol[] {
  const result: LanguageDocumentSymbol[] = [];

  for (const symbol of symbols) {
    result.push(symbol);
    result.push(...flattenDocumentSymbols(symbol.children));
  }

  return result;
}

function symbolRangeSize(symbol: LanguageDocumentSymbol): number {
  return symbol.rangeEnd - symbol.rangeStart;
}
