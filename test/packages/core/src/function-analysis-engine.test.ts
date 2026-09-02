import { describe, expect, it, vi } from "vitest";
import type { LanguageAdapter, LanguageAnalysisInput, LanguageFunctionInfo } from "@execlens/protocol";
import { analyzeFunctionContext, FunctionAnalysisEngine } from "../../../../packages/core/src/index.js";

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
      analyzeFunctionAtCursor: vi.fn(async () => null)
    };

    await expect(analyzeFunctionContext(adapter, input)).resolves.toBeNull();
  });
});
