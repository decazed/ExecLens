import type { LanguageAdapter, LanguageAnalysisInput, LanguageFunctionInfo } from "@execlens/protocol";

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
