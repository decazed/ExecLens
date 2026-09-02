import ts from "typescript";
import { getPropertyName } from "./ast.js";
import type { TypeDeclaration } from "./types.js";
import { getArrayElementType } from "./type-utils.js";

export function buildTemplateFromTypeNode(
  typeNode: ts.TypeNode,
  sourceFile: ts.SourceFile,
  typeDeclarations: Map<string, TypeDeclaration>,
  visitingNames: Set<string>,
  depth: number
): unknown {
  if (depth > 5) {
    return {};
  }

  switch (typeNode.kind) {
    case ts.SyntaxKind.StringKeyword:
      return "";
    case ts.SyntaxKind.NumberKeyword:
      return 0;
    case ts.SyntaxKind.BooleanKeyword:
      return false;
    case ts.SyntaxKind.NullKeyword:
      return null;
    case ts.SyntaxKind.AnyKeyword:
    case ts.SyntaxKind.UnknownKeyword:
      return "";
    case ts.SyntaxKind.ArrayType: {
      const arrayType = typeNode as ts.ArrayTypeNode;
      return [buildTemplateFromTypeNode(arrayType.elementType, sourceFile, typeDeclarations, visitingNames, depth + 1)];
    }
    case ts.SyntaxKind.TupleType: {
      const tupleType = typeNode as ts.TupleTypeNode;
      return tupleType.elements.map((element) =>
        buildTemplateFromTypeNode(element, sourceFile, typeDeclarations, visitingNames, depth + 1)
      );
    }
    case ts.SyntaxKind.LiteralType: {
      const literal = typeNode as ts.LiteralTypeNode;
      if (ts.isStringLiteral(literal.literal)) {
        return literal.literal.text;
      }
      if (ts.isNumericLiteral(literal.literal)) {
        return Number(literal.literal.text);
      }
      if (literal.literal.kind === ts.SyntaxKind.TrueKeyword) {
        return true;
      }
      if (literal.literal.kind === ts.SyntaxKind.FalseKeyword) {
        return false;
      }
      return "";
    }
    case ts.SyntaxKind.TypeLiteral: {
      const literalType = typeNode as ts.TypeLiteralNode;
      return buildObjectTemplateFromMembers(literalType.members, sourceFile, typeDeclarations, visitingNames, depth + 1);
    }
    case ts.SyntaxKind.UnionType: {
      const unionType = typeNode as ts.UnionTypeNode;
      const candidate =
        unionType.types.find((t) => t.kind !== ts.SyntaxKind.UndefinedKeyword && t.kind !== ts.SyntaxKind.NullKeyword) ??
        unionType.types[0];
      if (!candidate) {
        return "";
      }
      return buildTemplateFromTypeNode(candidate, sourceFile, typeDeclarations, visitingNames, depth + 1);
    }
    case ts.SyntaxKind.ParenthesizedType: {
      const inner = (typeNode as ts.ParenthesizedTypeNode).type;
      return buildTemplateFromTypeNode(inner, sourceFile, typeDeclarations, visitingNames, depth + 1);
    }
    case ts.SyntaxKind.TypeReference: {
      const refType = typeNode as ts.TypeReferenceNode;
      const typeName = refType.typeName.getText(sourceFile);

      if (typeName === "Array" && refType.typeArguments?.[0]) {
        return [
          buildTemplateFromTypeNode(refType.typeArguments[0], sourceFile, typeDeclarations, visitingNames, depth + 1)
        ];
      }
      if (typeName === "Record" && refType.typeArguments?.[1]) {
        return {
          key: buildTemplateFromTypeNode(refType.typeArguments[1], sourceFile, typeDeclarations, visitingNames, depth + 1)
        };
      }
      if ((typeName === "Partial" || typeName === "Readonly" || typeName === "Required") && refType.typeArguments?.[0]) {
        return buildTemplateFromTypeNode(refType.typeArguments[0], sourceFile, typeDeclarations, visitingNames, depth + 1);
      }
      if (typeName === "Date") {
        return "2026-01-01T00:00:00.000Z";
      }
      if (visitingNames.has(typeName)) {
        return {};
      }

      const declaration = typeDeclarations.get(typeName);
      if (!declaration) {
        return {};
      }

      visitingNames.add(typeName);
      const resolved =
        ts.isInterfaceDeclaration(declaration)
          ? buildObjectTemplateFromMembers(
              declaration.members,
              sourceFile,
              typeDeclarations,
              visitingNames,
              depth + 1
            )
          : buildTemplateFromTypeNode(declaration.type, sourceFile, typeDeclarations, visitingNames, depth + 1);
      visitingNames.delete(typeName);
      return resolved;
    }
    default:
      return "";
  }
}

export function buildTemplateFromType(
  type: ts.Type,
  checker: ts.TypeChecker,
  seen: Set<string>,
  depth: number
): unknown {
  if (depth > 8) {
    return {};
  }

  const flags = type.flags;
  if (type.isStringLiteral()) {
    return type.value;
  }
  if (flags & ts.TypeFlags.NumberLiteral) {
    return (type as ts.NumberLiteralType).value;
  }
  if (flags & ts.TypeFlags.BooleanLiteral) {
    const intrinsicName = (type as ts.Type & { intrinsicName?: string }).intrinsicName;
    if (intrinsicName === "true") {
      return true;
    }
    if (intrinsicName === "false") {
      return false;
    }
  }

  if (flags & ts.TypeFlags.StringLike) {
    return "";
  }
  if (flags & ts.TypeFlags.NumberLike) {
    return 0;
  }
  if (flags & ts.TypeFlags.BooleanLike) {
    return false;
  }
  if (flags & ts.TypeFlags.BigIntLike) {
    return 0;
  }
  if (flags & ts.TypeFlags.Null) {
    return null;
  }
  if (flags & ts.TypeFlags.Undefined) {
    return "";
  }

  if (type.isUnion()) {
    const candidate =
      type.types.find((unionType) => (unionType.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)) === 0) ??
      type.types[0];
    if (!candidate) {
      return "";
    }
    return buildTemplateFromType(candidate, checker, seen, depth + 1);
  }

  if (type.isIntersection()) {
    const merged: Record<string, unknown> = {};
    for (const innerType of type.types) {
      const partial = buildTemplateFromType(innerType, checker, seen, depth + 1);
      if (partial && typeof partial === "object" && !Array.isArray(partial)) {
        Object.assign(merged, partial);
      }
    }
    return Object.keys(merged).length > 0 ? merged : "";
  }

  if (checker.isArrayType(type)) {
    const elementType = getArrayElementType(type, checker);
    if (!elementType) {
      return [];
    }
    return [buildTemplateFromType(elementType, checker, seen, depth + 1)];
  }

  if (checker.isTupleType(type)) {
    const typeRef = type as ts.TypeReference;
    const tupleElements = checker.getTypeArguments(typeRef);
    return tupleElements.map((elementType) => buildTemplateFromType(elementType, checker, seen, depth + 1));
  }

  const typeName = checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation);
  if (typeName === "Date") {
    return "2026-01-01T00:00:00.000Z";
  }

  if (flags & ts.TypeFlags.Object) {
    if (seen.has(typeName)) {
      return {};
    }
    seen.add(typeName);

    const objectTemplate: Record<string, unknown> = {};
    const properties = checker.getPropertiesOfType(type);
    for (const property of properties) {
      if (property.getName() === "__proto__") {
        continue;
      }

      const declaration = property.valueDeclaration ?? property.declarations?.[0];
      if (!declaration) {
        objectTemplate[property.getName()] = "";
        continue;
      }

      const propertyType = checker.getTypeOfSymbolAtLocation(property, declaration);
      objectTemplate[property.getName()] = buildTemplateFromType(propertyType, checker, seen, depth + 1);
    }

    seen.delete(typeName);
    return objectTemplate;
  }

  return "";
}

export function primitiveTemplateToInput(template: unknown): string {
  if (template === null) {
    return "null";
  }
  if (typeof template === "string") {
    return template;
  }
  if (typeof template === "number" || typeof template === "boolean") {
    return String(template);
  }
  return "";
}

function buildObjectTemplateFromMembers(
  members: ts.NodeArray<ts.TypeElement>,
  sourceFile: ts.SourceFile,
  typeDeclarations: Map<string, TypeDeclaration>,
  visitingNames: Set<string>,
  depth: number
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const member of members) {
    if (!ts.isPropertySignature(member) || !member.name) {
      continue;
    }

    const key = getPropertyName(member.name, sourceFile);
    if (!key) {
      continue;
    }

    const template = member.type
      ? buildTemplateFromTypeNode(member.type, sourceFile, typeDeclarations, visitingNames, depth + 1)
      : "";
    result[key] = template;
  }

  return result;
}
