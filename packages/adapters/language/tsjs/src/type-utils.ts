import ts from "typescript";

export function getScriptKind(languageId: string): ts.ScriptKind | null {
  if (languageId === "typescript") {
    return ts.ScriptKind.TS;
  }
  if (languageId === "typescriptreact") {
    return ts.ScriptKind.TSX;
  }
  return null;
}

export function getArrayElementType(type: ts.Type, checker: ts.TypeChecker): ts.Type | null {
  if (!checker.isArrayType(type)) {
    return null;
  }

  const typeArguments = checker.getTypeArguments(type as ts.TypeReference);
  return typeArguments[0] ?? null;
}

export function unwrapNullableType(type: ts.Type): ts.Type {
  if (!type.isUnion()) {
    return type;
  }

  const filtered = type.types.filter((member) => (member.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined)) === 0);
  if (filtered.length === 1 && filtered[0]) {
    return filtered[0];
  }

  return type;
}

export function unwrapNullableTypeNode(typeNode: ts.TypeNode): ts.TypeNode {
  if (!ts.isUnionTypeNode(typeNode)) {
    return typeNode;
  }

  const filtered = typeNode.types.filter(
    (member) => member.kind !== ts.SyntaxKind.NullKeyword && member.kind !== ts.SyntaxKind.UndefinedKeyword
  );

  if (filtered.length === 1 && filtered[0]) {
    return filtered[0];
  }

  return typeNode;
}

export function typeAllowsNull(type: ts.Type): boolean {
  return type.isUnion() && type.types.some((member) => (member.flags & ts.TypeFlags.Null) !== 0);
}

export function typeAllowsUndefined(type: ts.Type): boolean {
  return type.isUnion() && type.types.some((member) => (member.flags & ts.TypeFlags.Undefined) !== 0);
}

export function typeNodeAllowsNull(typeNode: ts.TypeNode | undefined): boolean {
  return (
    !!typeNode &&
    ts.isUnionTypeNode(typeNode) &&
    typeNode.types.some((member) => member.kind === ts.SyntaxKind.NullKeyword)
  );
}

export function typeNodeAllowsUndefined(typeNode: ts.TypeNode | undefined): boolean {
  return (
    !!typeNode &&
    ts.isUnionTypeNode(typeNode) &&
    typeNode.types.some((member) => member.kind === ts.SyntaxKind.UndefinedKeyword)
  );
}
