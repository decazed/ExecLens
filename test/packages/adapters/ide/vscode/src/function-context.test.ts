import * as vscode from "vscode";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LanguageAdapter, LanguageDocumentSymbol, LanguageFunctionInfo } from "@execlens/protocol";
import { VsCodeFunctionContextService } from "../../../../../../packages/adapters/ide/vscode/src/function-context.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("VsCodeFunctionContextService", () => {
  it("returns null when no editor is active", async () => {
    const service = new VsCodeFunctionContextService(createAdapter(null));

    await expect(service.analyzeCurrentFunction(undefined)).resolves.toBeNull();
    await expect(service.getFunctionInfoUnderCursor(undefined)).resolves.toEqual({
      name: "No active editor",
      parameters: []
    });
  });

  it("returns null when VS Code has no document symbols", async () => {
    vi.spyOn(vscode.commands, "executeCommand").mockResolvedValue([]);
    const service = new VsCodeFunctionContextService(createAdapter(null));

    await expect(service.analyzeCurrentFunction(createEditor())).resolves.toBeNull();
    await expect(service.getFunctionInfoUnderCursor(createEditor())).resolves.toEqual({
      name: "No function found",
      parameters: []
    });
  });

  it("returns null when no language adapter handles the editor language", async () => {
    const executeCommand = vi.spyOn(vscode.commands, "executeCommand").mockResolvedValue([]);
    const adapters = [
      {
        id: "test",
        canAnalyze: vi.fn(() => false),
        analyzeFunctionAtCursor: vi.fn(async () => null)
      }
    ];
    const service = new VsCodeFunctionContextService(adapters);

    await expect(service.analyzeCurrentFunction(createEditor())).resolves.toBeNull();
    expect(adapters[0]?.canAnalyze).toHaveBeenCalledWith("typescript");
    expect(adapters[0]?.analyzeFunctionAtCursor).not.toHaveBeenCalled();
    expect(executeCommand).not.toHaveBeenCalled();
  });

  it("builds language analysis input from the active editor and VS Code symbols", async () => {
    const symbol = createDocumentSymbol("add", vscode.SymbolKind.Function, 0, 56);
    vi.spyOn(vscode.commands, "executeCommand").mockResolvedValue([symbol]);
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
    const adapters = createAdapter(functionInfo);
    const editor = createEditor();
    const service = new VsCodeFunctionContextService(adapters);

    const result = await service.analyzeCurrentFunction(editor);

    expect(result).toBe(functionInfo);
    expect(adapters[0]?.analyzeFunctionAtCursor).toHaveBeenCalledWith({
      documentText: "export function add(a: number): number { return a; }",
      fileName: "sample.ts",
      languageId: "typescript",
      cursorOffset: 41,
      symbols: [
        {
          name: "add",
          kind: "function",
          rangeStart: 0,
          rangeEnd: 56,
          children: []
        }
      ] satisfies LanguageDocumentSymbol[]
    });
  });

  it("adds a simulation target when a function is found", async () => {
    vi.spyOn(vscode.commands, "executeCommand").mockResolvedValue([
      createDocumentSymbol("add", vscode.SymbolKind.Function, 0, 56)
    ]);
    const service = new VsCodeFunctionContextService(
      createAdapter({
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
      })
    );

    await expect(service.getFunctionInfoUnderCursor(createEditor())).resolves.toMatchObject({
      name: "add",
      target: {
        kind: "function",
        filePath: "sample.ts",
        functionName: "add",
        parameterNames: ["a"]
      }
    });
  });
});

function createAdapter(result: LanguageFunctionInfo | null): LanguageAdapter[] {
  return [
    {
      id: "test",
      canAnalyze: vi.fn(() => true),
      analyzeFunctionAtCursor: vi.fn(async () => result)
    }
  ];
}

function createEditor(): never {
  const source = "export function add(a: number): number { return a; }";
  return {
    document: {
      uri: { fsPath: "sample.ts" },
      fileName: "sample.ts",
      languageId: "typescript",
      getText: vi.fn(() => source),
      offsetAt: vi.fn((position: { offset: number }) => position.offset)
    },
    selection: {
      active: { offset: source.indexOf("return") }
    }
  } as never;
}

function createDocumentSymbol(name: string, kind: number, start: number, end: number): never {
  return {
    name,
    kind,
    range: {
      start: { offset: start },
      end: { offset: end }
    },
    children: []
  } as never;
}
