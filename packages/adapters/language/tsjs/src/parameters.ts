import ts from "typescript";
import {
  collectTypeDeclarations,
  findFunctionNodeForSymbol,
  parseParametersFromDeclarationSlice
} from "./ast.js";
import { buildStructureFromType, buildStructureFromTypeNode } from "./structures.js";
import { buildTemplateFromType, buildTemplateFromTypeNode, primitiveTemplateToInput } from "./templates.js";
import { createTypeCheckerContext } from "./type-checker-context.js";
import {
  getScriptKind,
  typeAllowsNull,
  typeAllowsUndefined,
  typeNodeAllowsNull,
  typeNodeAllowsUndefined
} from "./type-utils.js";
import type { LanguageDocumentSymbol, LanguageParameterField, TypeDeclaration } from "./types.js";
import {
  buildControlFromTypeNode,
  buildInputModeFromType,
  buildOptionsFromTypeNode,
  withOptionalUiHints
} from "./ui-hints.js";

export function getFunctionParameters(input: {
  documentText: string;
  fileName: string;
  languageId: string;
  symbol: LanguageDocumentSymbol;
}): LanguageParameterField[] {
  const { documentText, fileName, languageId, symbol } = input;

  const scriptKind = getScriptKind(languageId);
  if (scriptKind === null) {
    return buildUnknownParameterFields(documentText, symbol);
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
    return buildUnknownParameterFields(documentText, symbol);
  }

  const typeDeclarations = collectTypeDeclarations(sourceFile);
  return functionNode.parameters.map((parameter) =>
    buildParameterFieldFromTypeNode(sourceFile, parameter, typeDeclarations)
  );
}

function buildUnknownParameterFields(
  documentText: string,
  symbol: LanguageDocumentSymbol
): LanguageParameterField[] {
  return parseParametersFromDeclarationSlice(documentText, symbol).map((name) => ({
    name,
    typeLabel: "unknown",
    editor: "value",
    initialValue: "",
    control: "text"
  }));
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
    const structure = parameter.type
      ? buildStructureFromTypeNode(parameter.type, sourceFile, typeDeclarations, new Set<string>(), 0)
      : undefined;
    return {
      name,
      typeLabel,
      editor: "json",
      initialValue: JSON.stringify(template, null, 2),
      allowNull: typeNodeAllowsNull(parameter.type),
      allowUndefined: typeNodeAllowsUndefined(parameter.type),
      ...(structure ? { structure } : {})
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
      const structure = buildStructureFromType(parameterType, checker, new Set<string>(), 0);
      return {
        name,
        typeLabel,
        editor: "json",
        initialValue: JSON.stringify(template, null, 2),
        allowNull: typeAllowsNull(parameterType),
        allowUndefined: typeAllowsUndefined(parameterType),
        ...(structure ? { structure } : {})
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
