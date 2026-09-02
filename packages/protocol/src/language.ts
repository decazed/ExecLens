import type { FunctionParameterField } from "./parameters.js";

export type MaybePromise<T> = T | Promise<T>;

export type LanguageParameterField = FunctionParameterField;

export type LanguageFunctionInfo = {
  name: string;
  parameters: LanguageParameterField[];
};

export type LanguageSymbolKind = "function" | "method" | "constructor" | "other";

export type LanguageDocumentSymbol = {
  name: string;
  kind: LanguageSymbolKind;
  rangeStart: number;
  rangeEnd: number;
  children: LanguageDocumentSymbol[];
};

export type LanguageAnalysisInput = {
  documentText: string;
  fileName: string;
  languageId: string;
  cursorOffset: number;
  symbols: LanguageDocumentSymbol[];
};

export type LanguageAdapter = {
  analyzeFunctionAtCursor(input: LanguageAnalysisInput): MaybePromise<LanguageFunctionInfo | null>;
};
