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

export const TSJS_LANGUAGE_IDS = [
  "typescript",
  "typescriptreact",
  "javascript",
  "javascriptreact"
] as const;

export class TsJsLanguageAdapter implements LanguageAdapter {
  public readonly id = "tsjs";

  public canAnalyze(languageId: string): boolean {
    return (TSJS_LANGUAGE_IDS as readonly string[]).includes(languageId);
  }

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
