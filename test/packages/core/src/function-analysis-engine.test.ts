import { describe, expect, it, vi } from "vitest";
import type { LanguageAdapter, LanguageAnalysisInput, LanguageFunctionInfo } from "@execlens/protocol";
import {
  analyzeFunctionContext,
  FunctionAnalysisEngine,
  selectLanguageAdapter
} from "../../../../packages/core/src/index.js";

const input: LanguageAnalysisInput = {
  documentText: "export function add(a: number, b: number) { return a + b; }",
  fileName: "sample.ts",
  languageId: "typescript",
  cursorOffset: 16,
  symbols: []
};

const functionInfo: LanguageFunctionInfo = {
  name: "add",
  parameters: [
    {
      name: "a",
      typeLabel: "number",
      editor: "value",
      initialValue: "0",
      control: "text"
    }
  ]
};

describe("FunctionAnalysisEngine", () => {
  it("delegates cursor analysis to the configured language adapter", async () => {
    const adapter: LanguageAdapter = {
      id: "test",
      canAnalyze: () => true,
      analyzeFunctionAtCursor: vi.fn(async () => functionInfo)
    };

    const result = await new FunctionAnalysisEngine(adapter).analyzeFunctionAtCursor(input);

    expect(adapter.analyzeFunctionAtCursor).toHaveBeenCalledWith(input);
    expect(result).toBe(functionInfo);
  });
});

describe("analyzeFunctionContext", () => {
  it("keeps the backwards-compatible function API", async () => {
    const adapter: LanguageAdapter = {
      id: "test",
      canAnalyze: () => true,
      analyzeFunctionAtCursor: vi.fn(async () => null)
    };

    await expect(analyzeFunctionContext(adapter, input)).resolves.toBeNull();
  });
});

describe("selectLanguageAdapter", () => {
  const makeAdapter = (id: string, languageIds: string[]): LanguageAdapter => ({
    id,
    canAnalyze: (languageId) => languageIds.includes(languageId),
    analyzeFunctionAtCursor: vi.fn(async () => null)
  });

  it("returns the first adapter that can analyze the language id", () => {
    const tsjs = makeAdapter("tsjs", ["typescript", "javascript"]);
    const python = makeAdapter("python", ["python"]);

    expect(selectLanguageAdapter([tsjs, python], "python")).toBe(python);
    expect(selectLanguageAdapter([tsjs, python], "typescript")).toBe(tsjs);
  });

  it("returns null when no adapter matches", () => {
    const tsjs = makeAdapter("tsjs", ["typescript"]);

    expect(selectLanguageAdapter([tsjs], "rust")).toBeNull();
    expect(selectLanguageAdapter([], "typescript")).toBeNull();
  });
});
