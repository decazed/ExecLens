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
  /** Stable identifier for this adapter, e.g. `"tsjs"`. */
  readonly id: string;
  /**
   * Whether this adapter can analyze a document with the given IDE language id
   * (for example `"typescript"`, `"python"`). A composition root uses this to
   * pick an adapter from a set.
   */
  canAnalyze(languageId: string): boolean;
  analyzeFunctionAtCursor(input: LanguageAnalysisInput): MaybePromise<LanguageFunctionInfo | null>;
};
