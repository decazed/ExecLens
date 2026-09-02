import * as vscode from "vscode";
import type { LanguageDocumentSymbol } from "@execlens/protocol";

export function toLanguageSymbol(document: vscode.TextDocument, symbol: vscode.DocumentSymbol): LanguageDocumentSymbol {
  return {
    name: symbol.name,
    kind: mapSymbolKind(symbol.kind),
    rangeStart: document.offsetAt(symbol.range.start),
    rangeEnd: document.offsetAt(symbol.range.end),
    children: symbol.children.map((child) => toLanguageSymbol(document, child))
  };
}

function mapSymbolKind(kind: vscode.SymbolKind): LanguageDocumentSymbol["kind"] {
  if (kind === vscode.SymbolKind.Function) {
    return "function";
  }
  if (kind === vscode.SymbolKind.Method) {
    return "method";
  }
  if (kind === vscode.SymbolKind.Constructor) {
    return "constructor";
  }
  return "other";
}
