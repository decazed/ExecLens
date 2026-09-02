import ts from "typescript";
import type { InputMode, LanguageParameterField, TypeDeclaration } from "./types.js";
import { unwrapNullableType, unwrapNullableTypeNode } from "./type-utils.js";

export function withOptionalUiHints(
  input: InputMode
): Pick<LanguageParameterField, "control" | "options"> | Record<string, never> {
  return {
    ...(input.control ? { control: input.control } : {}),
    ...(input.options && input.options.length > 0 ? { options: input.options } : {})
  };
}

export function buildInputModeFromType(type: ts.Type, checker: ts.TypeChecker): InputMode {
  const coreType = unwrapNullableType(type);
  if (coreType.flags & ts.TypeFlags.BooleanLike) {
    return { control: "boolean", options: undefined };
  }

  const enumOptions = getEnumOptions(coreType, checker);
  if (enumOptions.length > 0) {
    return { control: "select", options: enumOptions };
  }

  const unionOptions = getLiteralUnionOptions(coreType);
  if (isBooleanOptionSet(unionOptions)) {
    return { control: "boolean", options: undefined };
  }

  if (unionOptions.length > 0) {
    return { control: "select", options: unionOptions };
  }

  return { control: "text", options: undefined };
}

export function buildControlFromTypeNode(
  typeNode: ts.TypeNode | undefined,
  sourceFile: ts.SourceFile,
  typeDeclarations: Map<string, TypeDeclaration>
): LanguageParameterField["control"] {
  if (!typeNode) {
    return "text";
  }

  const coreTypeNode = unwrapNullableTypeNode(typeNode);
  if (coreTypeNode.kind === ts.SyntaxKind.BooleanKeyword) {
    return "boolean";
  }

  const options = buildOptionsFromTypeNode(coreTypeNode, sourceFile, typeDeclarations);
  if (isBooleanOptionSet(options ?? [])) {
    return "boolean";
  }

  if (options?.length) {
    return "select";
  }

  return "text";
}

export function buildOptionsFromTypeNode(
  typeNode: ts.TypeNode | undefined,
  sourceFile: ts.SourceFile,
  typeDeclarations: Map<string, TypeDeclaration>
): Array<{ label: string; value: string }> | undefined {
  if (!typeNode) {
    return undefined;
  }

  const coreTypeNode = unwrapNullableTypeNode(typeNode);
  if (ts.isUnionTypeNode(coreTypeNode)) {
    const supportedMembers = coreTypeNode.types.filter(
      (member) => member.kind !== ts.SyntaxKind.NullKeyword && member.kind !== ts.SyntaxKind.UndefinedKeyword
    );
    const options = supportedMembers
      .map((member) => getLiteralOptionFromTypeNode(member))
      .filter((member): member is { label: string; value: string } => member !== null);

    if (options.length === supportedMembers.length) {
      return options;
    }
  }

  if (ts.isTypeReferenceNode(coreTypeNode)) {
    const typeName = coreTypeNode.typeName.getText(sourceFile);
    const declaration = typeDeclarations.get(typeName);
    if (declaration && ts.isTypeAliasDeclaration(declaration)) {
      return buildOptionsFromTypeNode(declaration.type, sourceFile, typeDeclarations);
    }
  }

  return undefined;
}

function getLiteralUnionOptions(type: ts.Type): Array<{ label: string; value: string }> {
  if (!type.isUnion()) {
    return [];
  }

  const options: Array<{ label: string; value: string }> = [];
  for (const member of type.types) {
    if (member.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined)) {
      continue;
    }

    const literalValue = getLiteralOptionValue(member);
    if (literalValue === null) {
      return [];
    }

    options.push(literalValue);
  }

  return options;
}

function getLiteralOptionValue(type: ts.Type): { label: string; value: string } | null {
  if (type.isStringLiteral()) {
    return { label: type.value, value: type.value };
  }

  if (type.flags & ts.TypeFlags.NumberLiteral) {
    const numberLiteral = type as ts.NumberLiteralType;
    return { label: String(numberLiteral.value), value: String(numberLiteral.value) };
  }

  if (type.flags & ts.TypeFlags.BooleanLiteral) {
    const intrinsicName = (type as ts.Type & { intrinsicName?: string }).intrinsicName;
    if (intrinsicName === "true" || intrinsicName === "false") {
      return { label: intrinsicName, value: intrinsicName };
    }
  }

  return null;
}

function isBooleanOptionSet(options: Array<{ label: string; value: string }>): boolean {
  if (options.length !== 2) {
    return false;
  }

  const values = new Set(options.map((option) => option.value));
  return values.has("true") && values.has("false");
}

function getEnumOptions(type: ts.Type, checker: ts.TypeChecker): Array<{ label: string; value: string }> {
  const symbol = type.aliasSymbol ?? type.getSymbol();
  if (!symbol) {
    return [];
  }

  const enumDeclaration = symbol.declarations?.find(ts.isEnumDeclaration);
  if (!enumDeclaration) {
    return [];
  }

  const options: Array<{ label: string; value: string }> = [];
  for (const member of enumDeclaration.members) {
    const label = member.name.getText();
    const constantValue = checker.getConstantValue(member);

    if (typeof constantValue === "string" || typeof constantValue === "number") {
      options.push({ label, value: String(constantValue) });
      continue;
    }

    if (member.initializer && ts.isStringLiteral(member.initializer)) {
      options.push({ label, value: member.initializer.text });
      continue;
    }

    if (member.initializer && ts.isNumericLiteral(member.initializer)) {
      options.push({ label, value: member.initializer.text });
    }
  }

  return options;
}

function getLiteralOptionFromTypeNode(typeNode: ts.TypeNode): { label: string; value: string } | null {
  if (!ts.isLiteralTypeNode(typeNode)) {
    return null;
  }

  if (ts.isStringLiteral(typeNode.literal)) {
    return { label: typeNode.literal.text, value: typeNode.literal.text };
  }

  if (ts.isNumericLiteral(typeNode.literal)) {
    return { label: typeNode.literal.text, value: typeNode.literal.text };
  }

  if (typeNode.literal.kind === ts.SyntaxKind.TrueKeyword) {
    return { label: "true", value: "true" };
  }

  if (typeNode.literal.kind === ts.SyntaxKind.FalseKeyword) {
    return { label: "false", value: "false" };
  }

  return null;
}
