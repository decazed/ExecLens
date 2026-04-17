import path from "node:path";
import ts from "typescript";

export type LanguageParameterField = {
  name: string;
  typeLabel: string;
  editor: "value" | "json";
  initialValue: string;
  control?: "text" | "boolean" | "select";
  options?: Array<{
    label: string;
    value: string;
  }>;
  allowNull?: boolean;
  allowUndefined?: boolean;
};

export type LanguageFunctionInfo = {
  name: string;
  parameters: LanguageParameterField[];
};

export type LanguageSymbolKind = "function" | "method" | "constructor" | "other";

export type LanguageDocumentSymbol = {
  name: string;
  kind: LanguageSymbolKind;
  rangeStart: number;
  rangeEnd: number;
  children: LanguageDocumentSymbol[];
};

type TypeDeclaration = ts.InterfaceDeclaration | ts.TypeAliasDeclaration;
type FunctionNode = ts.FunctionDeclaration | ts.MethodDeclaration | ts.ConstructorDeclaration;

type AnalyzeInput = {
  documentText: string;
  fileName: string;
  languageId: string;
  cursorOffset: number;
  symbols: LanguageDocumentSymbol[];
};

export function analyzeFunctionAtCursor(input: AnalyzeInput): LanguageFunctionInfo | null {
  const { documentText, fileName, languageId, cursorOffset, symbols } = input;
  const functionSymbol = getFunctionSymbolUnderCursor(symbols, cursorOffset);
  if (!functionSymbol) {
    return null;
  }

  return {
    name: functionSymbol.name,
    parameters: getFunctionParameters({
      documentText,
      fileName,
      languageId,
      symbol: functionSymbol
    })
  };
}

function getFunctionSymbolUnderCursor(
  symbols: LanguageDocumentSymbol[],
  cursorOffset: number
): LanguageDocumentSymbol | null {
  const candidates = flattenDocumentSymbols(symbols).filter(
    (symbol) =>
      (symbol.kind === "function" || symbol.kind === "method" || symbol.kind === "constructor") &&
      symbol.rangeStart <= cursorOffset &&
      cursorOffset <= symbol.rangeEnd
  );

  if (candidates.length === 0) {
    return null;
  }

  let best: LanguageDocumentSymbol | null = null;
  for (const candidate of candidates) {
    if (!best || symbolRangeSize(candidate) < symbolRangeSize(best)) {
      best = candidate;
    }
  }

  return best;
}

function flattenDocumentSymbols(symbols: LanguageDocumentSymbol[]): LanguageDocumentSymbol[] {
  const result: LanguageDocumentSymbol[] = [];

  for (const symbol of symbols) {
    result.push(symbol);
    result.push(...flattenDocumentSymbols(symbol.children));
  }

  return result;
}

function symbolRangeSize(symbol: LanguageDocumentSymbol): number {
  return symbol.rangeEnd - symbol.rangeStart;
}

function getFunctionParameters(input: {
  documentText: string;
  fileName: string;
  languageId: string;
  symbol: LanguageDocumentSymbol;
}): LanguageParameterField[] {
  const { documentText, fileName, languageId, symbol } = input;

  const scriptKind = getScriptKind(languageId);
  if (scriptKind === null) {
    return parseParametersFromDeclarationSlice(documentText, symbol).map((name) => ({
      name,
      typeLabel: "unknown",
      editor: "value",
      initialValue: "",
      control: "text"
    }));
  }

  const fromTypeChecker = getParameterFieldsFromTypeChecker({
    documentText,
    fileName,
    symbol,
    scriptKind
  });
  if (fromTypeChecker && fromTypeChecker.length > 0) {
    return fromTypeChecker;
  }

  const sourceFile = ts.createSourceFile(fileName, documentText, ts.ScriptTarget.Latest, true, scriptKind);
  const functionNode = findFunctionNodeForSymbol(sourceFile, symbol);
  if (!functionNode) {
    return parseParametersFromDeclarationSlice(documentText, symbol).map((name) => ({
      name,
      typeLabel: "unknown",
      editor: "value",
      initialValue: "",
      control: "text"
    }));
  }

  const typeDeclarations = collectTypeDeclarations(sourceFile);
  return functionNode.parameters.map((parameter) =>
    buildParameterFieldFromTypeNode(sourceFile, parameter, typeDeclarations)
  );
}

function parseParametersFromDeclarationSlice(documentText: string, symbol: LanguageDocumentSymbol): string[] {
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

function findFunctionNodeForSymbol(sourceFile: ts.SourceFile, symbol: LanguageDocumentSymbol): FunctionNode | null {
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

function getFunctionNodeName(node: FunctionNode, sourceFile: ts.SourceFile): string {
  if (ts.isConstructorDeclaration(node)) {
    return "constructor";
  }
  if (!node.name) {
    return "";
  }
  return node.name.getText(sourceFile);
}

function collectTypeDeclarations(sourceFile: ts.SourceFile): Map<string, TypeDeclaration> {
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

function buildParameterFieldFromTypeNode(
  sourceFile: ts.SourceFile,
  parameter: ts.ParameterDeclaration,
  typeDeclarations: Map<string, TypeDeclaration>
): LanguageParameterField {
  const rawName = parameter.name.getText(sourceFile).trim();
  const name = rawName.replace(/^\.{3}/, "");
  const typeLabel = parameter.type?.getText(sourceFile) ?? "unknown";
  const template = parameter.type
    ? buildTemplateFromTypeNode(parameter.type, sourceFile, typeDeclarations, new Set<string>(), 0)
    : "";

  if (template !== null && typeof template === "object") {
    return {
      name,
      typeLabel,
      editor: "json",
      initialValue: JSON.stringify(template, null, 2),
      allowNull: typeNodeAllowsNull(parameter.type),
      allowUndefined: typeNodeAllowsUndefined(parameter.type)
    };
  }

  return {
    name,
    typeLabel,
    editor: "value",
    initialValue: primitiveTemplateToInput(template),
    ...withOptionalUiHints({
      control: buildControlFromTypeNode(parameter.type, sourceFile, typeDeclarations),
      options: buildOptionsFromTypeNode(parameter.type, sourceFile, typeDeclarations)
    }),
    allowNull: typeNodeAllowsNull(parameter.type),
    allowUndefined: typeNodeAllowsUndefined(parameter.type)
  };
}

function buildTemplateFromTypeNode(
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

function getPropertyName(nameNode: ts.PropertyName, sourceFile: ts.SourceFile): string | null {
  if (ts.isIdentifier(nameNode) || ts.isStringLiteral(nameNode) || ts.isNumericLiteral(nameNode)) {
    return nameNode.text;
  }
  return nameNode.getText(sourceFile).replace(/^["']|["']$/g, "");
}

function primitiveTemplateToInput(template: unknown): string {
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

function getParameterFieldsFromTypeChecker(input: {
  documentText: string;
  fileName: string;
  symbol: LanguageDocumentSymbol;
  scriptKind: ts.ScriptKind;
}): LanguageParameterField[] | null {
  const { documentText, fileName, symbol, scriptKind } = input;
  const context = createTypeCheckerContext({ documentText, fileName, scriptKind });
  if (!context) {
    return null;
  }

  const functionNode = findFunctionNodeForSymbol(context.sourceFile, symbol);
  if (!functionNode) {
    return null;
  }

  const checker = context.program.getTypeChecker();
  return functionNode.parameters.map((parameter) => {
    const rawName = parameter.name.getText(context.sourceFile).trim();
    const name = rawName.replace(/^\.{3}/, "");
    const parameterType = checker.getTypeAtLocation(parameter);
    const typeLabel = checker.typeToString(parameterType, parameter, ts.TypeFormatFlags.NoTruncation);
    const template = buildTemplateFromType(parameterType, checker, new Set<string>(), 0);

    if (template !== null && typeof template === "object") {
      return {
        name,
        typeLabel,
        editor: "json",
        initialValue: JSON.stringify(template, null, 2),
        allowNull: typeAllowsNull(parameterType),
        allowUndefined: typeAllowsUndefined(parameterType)
      };
    }

    const inputMode = buildInputModeFromType(parameterType, checker);
    return {
      name,
      typeLabel,
      editor: "value",
      initialValue: primitiveTemplateToInput(template),
      ...withOptionalUiHints(inputMode),
      allowNull: typeAllowsNull(parameterType),
      allowUndefined: typeAllowsUndefined(parameterType)
    };
  });
}

function withOptionalUiHints(input: {
  control: LanguageParameterField["control"] | undefined;
  options: Array<{ label: string; value: string }> | undefined;
}): Pick<LanguageParameterField, "control" | "options"> | Record<string, never> {
  return {
    ...(input.control ? { control: input.control } : {}),
    ...(input.options && input.options.length > 0 ? { options: input.options } : {})
  };
}

function buildInputModeFromType(
  type: ts.Type,
  checker: ts.TypeChecker
): { control: LanguageParameterField["control"] | undefined; options: Array<{ label: string; value: string }> | undefined } {
  const coreType = unwrapNullableType(type);
  if (coreType.flags & ts.TypeFlags.BooleanLike) {
    return { control: "boolean", options: undefined };
  }

  const unionOptions = getLiteralUnionOptions(coreType);
  if (unionOptions.length > 0) {
    return { control: "select", options: unionOptions };
  }

  const enumOptions = getEnumOptions(coreType, checker);
  if (enumOptions.length > 0) {
    return { control: "select", options: enumOptions };
  }

  return { control: "text", options: undefined };
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

function unwrapNullableType(type: ts.Type): ts.Type {
  if (!type.isUnion()) {
    return type;
  }

  const filtered = type.types.filter((member) => (member.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined)) === 0);
  if (filtered.length === 1 && filtered[0]) {
    return filtered[0];
  }

  return type;
}

function typeAllowsNull(type: ts.Type): boolean {
  return type.isUnion() && type.types.some((member) => (member.flags & ts.TypeFlags.Null) !== 0);
}

function typeAllowsUndefined(type: ts.Type): boolean {
  return type.isUnion() && type.types.some((member) => (member.flags & ts.TypeFlags.Undefined) !== 0);
}

function typeNodeAllowsNull(typeNode: ts.TypeNode | undefined): boolean {
  return (
    !!typeNode &&
    ts.isUnionTypeNode(typeNode) &&
    typeNode.types.some((member) => member.kind === ts.SyntaxKind.NullKeyword)
  );
}

function typeNodeAllowsUndefined(typeNode: ts.TypeNode | undefined): boolean {
  return (
    !!typeNode &&
    ts.isUnionTypeNode(typeNode) &&
    typeNode.types.some((member) => member.kind === ts.SyntaxKind.UndefinedKeyword)
  );
}

function buildControlFromTypeNode(
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

  if (buildOptionsFromTypeNode(coreTypeNode, sourceFile, typeDeclarations)?.length) {
    return "select";
  }

  return "text";
}

function buildOptionsFromTypeNode(
  typeNode: ts.TypeNode | undefined,
  sourceFile: ts.SourceFile,
  typeDeclarations: Map<string, TypeDeclaration>
): Array<{ label: string; value: string }> | undefined {
  if (!typeNode) {
    return undefined;
  }

  const coreTypeNode = unwrapNullableTypeNode(typeNode);
  if (ts.isUnionTypeNode(coreTypeNode)) {
    const options = coreTypeNode.types
      .filter((member) => member.kind !== ts.SyntaxKind.NullKeyword && member.kind !== ts.SyntaxKind.UndefinedKeyword)
      .map((member) => getLiteralOptionFromTypeNode(member))
      .filter((member): member is { label: string; value: string } => member !== null);

    if (options.length === coreTypeNode.types.filter((member) => member.kind !== ts.SyntaxKind.NullKeyword && member.kind !== ts.SyntaxKind.UndefinedKeyword).length) {
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

function unwrapNullableTypeNode(typeNode: ts.TypeNode): ts.TypeNode {
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

function createTypeCheckerContext(input: {
  documentText: string;
  fileName: string;
  scriptKind: ts.ScriptKind;
}): { program: ts.Program; sourceFile: ts.SourceFile } | null {
  const { documentText, fileName, scriptKind } = input;
  const configPath = ts.findConfigFile(path.dirname(fileName), ts.sys.fileExists, "tsconfig.json");
  if (!configPath) {
    return null;
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    return null;
  }

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
  const normalizedDocPath = normalizeFilePath(fileName);
  const hasDocInRoots = parsed.fileNames.some((name) => normalizeFilePath(name) === normalizedDocPath);
  const rootNames = hasDocInRoots ? parsed.fileNames : [...parsed.fileNames, fileName];

  const host = ts.createCompilerHost(parsed.options, true);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (hostFileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    if (normalizeFilePath(hostFileName) === normalizedDocPath) {
      return ts.createSourceFile(hostFileName, documentText, languageVersion, true, scriptKind);
    }
    return originalGetSourceFile(hostFileName, languageVersion, onError, shouldCreateNewSourceFile);
  };

  const program = ts.createProgram({
    rootNames,
    options: parsed.options,
    host
  });

  const sourceFile =
    program.getSourceFile(fileName) ??
    program.getSourceFiles().find((file) => normalizeFilePath(file.fileName) === normalizedDocPath);
  if (!sourceFile) {
    return null;
  }

  return { program, sourceFile };
}

function buildTemplateFromType(type: ts.Type, checker: ts.TypeChecker, seen: Set<string>, depth: number): unknown {
  if (depth > 8) {
    return {};
  }

  const flags = type.flags;
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

function normalizeFilePath(fileName: string): string {
  const normalized = path.normalize(fileName);
  return ts.sys.useCaseSensitiveFileNames ? normalized : normalized.toLowerCase();
}

function getArrayElementType(type: ts.Type, checker: ts.TypeChecker): ts.Type | null {
  if (!checker.isArrayType(type)) {
    return null;
  }

  const typeArguments = checker.getTypeArguments(type as ts.TypeReference);
  return typeArguments[0] ?? null;
}

function getScriptKind(languageId: string): ts.ScriptKind | null {
  if (languageId === "typescript") {
    return ts.ScriptKind.TS;
  }
  if (languageId === "typescriptreact") {
    return ts.ScriptKind.TSX;
  }
  return null;
}
