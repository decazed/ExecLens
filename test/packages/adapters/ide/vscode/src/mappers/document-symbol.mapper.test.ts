import * as vscode from "vscode";
import { describe, expect, it, vi } from "vitest";
import { toLanguageSymbol } from "../../../../../../../packages/adapters/ide/vscode/src/mappers/document-symbol.mapper.js";

describe("toLanguageSymbol", () => {
  it("maps VS Code document symbols to protocol symbols recursively", () => {
    const document = {
      offsetAt: vi.fn((position: { offset: number }) => position.offset)
    };
    const symbol = {
      name: "outer",
      kind: vscode.SymbolKind.Function,
      range: {
        start: { offset: 10 },
        end: { offset: 100 }
      },
      children: [
        {
          name: "inner",
          kind: vscode.SymbolKind.Method,
          range: {
            start: { offset: 30 },
            end: { offset: 70 }
          },
          children: []
        },
        {
          name: "value",
          kind: 999,
          range: {
            start: { offset: 80 },
            end: { offset: 90 }
          },
          children: []
        }
      ]
    };

    expect(toLanguageSymbol(document as never, symbol as never)).toEqual({
      name: "outer",
      kind: "function",
      rangeStart: 10,
      rangeEnd: 100,
      children: [
        {
          name: "inner",
          kind: "method",
          rangeStart: 30,
          rangeEnd: 70,
          children: []
        },
        {
          name: "value",
          kind: "other",
          rangeStart: 80,
          rangeEnd: 90,
          children: []
        }
      ]
    });
  });

  it("maps constructor symbols explicitly", () => {
    const document = {
      offsetAt: vi.fn((position: { offset: number }) => position.offset)
    };

    expect(
      toLanguageSymbol(document as never, {
        name: "constructor",
        kind: vscode.SymbolKind.Constructor,
        range: {
          start: { offset: 1 },
          end: { offset: 2 }
        },
        children: []
      } as never)
    ).toMatchObject({
      name: "constructor",
      kind: "constructor"
    });
  });
});
