import type { LanguageAdapter, LanguageAnalysisInput, LanguageFunctionInfo } from "@execlens/protocol";

/**
 * Pick the first language adapter that reports it can analyze `languageId`.
 * Returns `null` when no adapter matches.
 */
export function selectLanguageAdapter(
  adapters: readonly LanguageAdapter[],
  languageId: string
): LanguageAdapter | null {
  return adapters.find((adapter) => adapter.canAnalyze(languageId)) ?? null;
}

export class FunctionAnalysisEngine {
  public constructor(private readonly languageAdapter: LanguageAdapter) {}

  public async analyzeFunctionAtCursor(input: LanguageAnalysisInput): Promise<LanguageFunctionInfo | null> {
    return this.languageAdapter.analyzeFunctionAtCursor(input);
  }
}

export async function analyzeFunctionContext(
  languageAdapter: LanguageAdapter,
  input: LanguageAnalysisInput
): Promise<LanguageFunctionInfo | null> {
  return new FunctionAnalysisEngine(languageAdapter).analyzeFunctionAtCursor(input);
}
