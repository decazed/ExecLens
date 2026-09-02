import type { FunctionParameterField } from "./parameters.js";

/** A value that may be returned synchronously or as a promise. */
export type MaybePromise<T> = T | Promise<T>;

/** Alias of {@link FunctionParameterField}, used in language-analysis output. */
export type LanguageParameterField = FunctionParameterField;

/** The result of analyzing the function under the cursor: its name and inputs. */
export type LanguageFunctionInfo = {
  name: string;
  parameters: LanguageParameterField[];
};

/** The kinds of document symbol a language adapter reasons about. */
export type LanguageSymbolKind = "function" | "method" | "constructor" | "other";

/**
 * An IDE-neutral document symbol. Offsets are character offsets into the
 * document text. `children` is the nested symbol tree.
 */
export type LanguageDocumentSymbol = {
  name: string;
  kind: LanguageSymbolKind;
  rangeStart: number;
  rangeEnd: number;
  children: LanguageDocumentSymbol[];
};

/**
 * Everything a language adapter needs to analyze the function at the cursor.
 * `symbols` may be empty (not every IDE provides them), so an adapter should
 * still attempt to work from `documentText` alone.
 */
export type LanguageAnalysisInput = {
  documentText: string;
  fileName: string;
  languageId: string;
  cursorOffset: number;
  symbols: LanguageDocumentSymbol[];
};

/**
 * Implemented by language packages (e.g. `@execlens/adapter-tsjs`). A language
 * adapter analyzes source; it does not orchestrate simulations or execute code.
 */
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
