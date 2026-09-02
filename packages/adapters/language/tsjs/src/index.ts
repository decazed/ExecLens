import { getFunctionParameters } from "./parameters.js";
import { getFunctionSymbolUnderCursor } from "./symbols.js";
import type { AnalyzeInput, LanguageAdapter, LanguageFunctionInfo } from "./types.js";

export type {
  AnalyzeInput,
  LanguageDocumentSymbol,
  LanguageFunctionInfo,
  LanguageParameterField,
  LanguageSymbolKind
} from "./types.js";

export class TsJsLanguageAdapter implements LanguageAdapter {
  public analyzeFunctionAtCursor(input: AnalyzeInput): LanguageFunctionInfo | null {
    return analyzeFunctionAtCursor(input);
  }
}

export function analyzeFunctionAtCursor(input: AnalyzeInput): LanguageFunctionInfo | null {
  const { documentText, fileName, languageId, cursorOffset, symbols } = input;
  const functionSymbol = getFunctionSymbolUnderCursor(symbols, cursorOffset);
  if (!functionSymbol) {
    return null;
  }

  return {
    name: functionSymbol.name,
    parameters: getFunctionParameters({
      documentText,
      fileName,
      languageId,
      symbol: functionSymbol
    })
  };
}
