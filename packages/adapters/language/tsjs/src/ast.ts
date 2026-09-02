import ts from "typescript";
import type { FunctionNode, LanguageDocumentSymbol, TypeDeclaration } from "./types.js";

export function parseParametersFromDeclarationSlice(
  documentText: string,
  symbol: LanguageDocumentSymbol
): string[] {
  const declarationText = documentText.slice(symbol.rangeStart, symbol.rangeEnd);
  const firstLine = declarationText.split(/\r?\n/, 1)[0] ?? "";
  const paramsMatch = firstLine.match(/\(([^)]*)\)/);
  if (!paramsMatch) {
    return [];
  }

  const rawParams = paramsMatch[1] ?? "";
  if (rawParams.trim().length === 0) {
    return [];
  }

  return rawParams
    .split(",")
    .map((param) => param.trim())
    .map((param) => param.replace(/^\.{3}/, ""))
    .map((param) => param.replace(/\s*=.*$/, "").trim())
    .filter((param) => param.length > 0);
}

export function findFunctionNodeForSymbol(
  sourceFile: ts.SourceFile,
  symbol: LanguageDocumentSymbol
): FunctionNode | null {
  const symbolStart = symbol.rangeStart;
  const symbolEnd = symbol.rangeEnd;
  let best: FunctionNode | null = null;

  const visit = (node: ts.Node): void => {
    if (
      (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node)) &&
      node.getStart(sourceFile) >= symbolStart &&
      node.getEnd() <= symbolEnd
    ) {
      const nodeName = getFunctionNodeName(node, sourceFile);
      if (nodeName === symbol.name) {
        if (!best || node.getWidth(sourceFile) < best.getWidth(sourceFile)) {
          best = node;
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  if (best) {
    return best;
  }

  const fallbackVisit = (node: ts.Node): void => {
    if (
      (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node)) &&
      node.getStart(sourceFile) >= symbolStart &&
      node.getEnd() <= symbolEnd
    ) {
      if (!best || node.getWidth(sourceFile) < best.getWidth(sourceFile)) {
        best = node;
      }
    }
    ts.forEachChild(node, fallbackVisit);
  };

  fallbackVisit(sourceFile);
  return best;
}

export function collectTypeDeclarations(sourceFile: ts.SourceFile): Map<string, TypeDeclaration> {
  const declarations = new Map<string, TypeDeclaration>();

  const visit = (node: ts.Node): void => {
    if (ts.isInterfaceDeclaration(node)) {
      declarations.set(node.name.text, node);
    } else if (ts.isTypeAliasDeclaration(node)) {
      declarations.set(node.name.text, node);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return declarations;
}

export function getPropertyName(nameNode: ts.PropertyName, sourceFile: ts.SourceFile): string | null {
  if (ts.isIdentifier(nameNode) || ts.isStringLiteral(nameNode) || ts.isNumericLiteral(nameNode)) {
    return nameNode.text;
  }
  return nameNode.getText(sourceFile).replace(/^["']|["']$/g, "");
}

function getFunctionNodeName(node: FunctionNode, sourceFile: ts.SourceFile): string {
  if (ts.isConstructorDeclaration(node)) {
    return "constructor";
  }
  if (!node.name) {
    return "";
  }
  return node.name.getText(sourceFile);
}
