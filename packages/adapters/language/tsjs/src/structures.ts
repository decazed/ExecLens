import ts from "typescript";
import type { SimulatorStructureNode } from "@execlens/protocol";
import { getPropertyName } from "./ast.js";
import type { LanguageParameterField, TypeDeclaration } from "./types.js";
import {
  getArrayElementType,
  typeAllowsNull,
  typeAllowsUndefined,
  typeNodeAllowsNull,
  typeNodeAllowsUndefined,
  unwrapNullableType,
  unwrapNullableTypeNode
} from "./type-utils.js";
import { buildControlFromTypeNode, buildInputModeFromType, buildOptionsFromTypeNode } from "./ui-hints.js";

export function buildStructureFromTypeNode(
  typeNode: ts.TypeNode,
  sourceFile: ts.SourceFile,
  typeDeclarations: Map<string, TypeDeclaration>,
  visitingNames: Set<string>,
  depth: number
): SimulatorStructureNode | undefined {
  if (depth > 6) {
    return undefined;
  }

  const typeLabel = typeNode.getText(sourceFile);
  const allowNull = typeNodeAllowsNull(typeNode);
  const allowUndefined = typeNodeAllowsUndefined(typeNode);
  const coreTypeNode = unwrapNullableTypeNode(typeNode);

  if (ts.isTypeLiteralNode(coreTypeNode)) {
    const properties: Record<string, SimulatorStructureNode> = {};
    for (const member of coreTypeNode.members) {
      if (!ts.isPropertySignature(member) || !member.name || !member.type) {
        continue;
      }

      const key = getPropertyName(member.name, sourceFile);
      if (!key) {
        continue;
      }

      const child = buildStructureFromTypeNode(member.type, sourceFile, typeDeclarations, visitingNames, depth + 1);
      if (child) {
        properties[key] = child;
      }
    }

    return { kind: "object", typeLabel, properties, allowNull, allowUndefined };
  }

  if (ts.isArrayTypeNode(coreTypeNode)) {
    const item = buildStructureFromTypeNode(coreTypeNode.elementType, sourceFile, typeDeclarations, visitingNames, depth + 1);
    if (!item) {
      return undefined;
    }
    return { kind: "array", typeLabel, item, allowNull, allowUndefined };
  }

  if (ts.isTupleTypeNode(coreTypeNode)) {
    const items = coreTypeNode.elements
      .map((element) => buildStructureFromTypeNode(element, sourceFile, typeDeclarations, visitingNames, depth + 1))
      .filter((element): element is SimulatorStructureNode => !!element);

    return { kind: "tuple", typeLabel, items, allowNull, allowUndefined };
  }

  if (ts.isTypeReferenceNode(coreTypeNode)) {
    const typeName = coreTypeNode.typeName.getText(sourceFile);

    if (typeName === "Array" && coreTypeNode.typeArguments?.[0]) {
      const item = buildStructureFromTypeNode(
        coreTypeNode.typeArguments[0],
        sourceFile,
        typeDeclarations,
        visitingNames,
        depth + 1
      );
      if (!item) {
        return undefined;
      }
      return { kind: "array", typeLabel, item, allowNull, allowUndefined };
    }

    const declaration = typeDeclarations.get(typeName);
    if (declaration && !visitingNames.has(typeName)) {
      visitingNames.add(typeName);
      const resolved = ts.isInterfaceDeclaration(declaration)
        ? buildStructureFromMembers(
            declaration.members,
            sourceFile,
            typeDeclarations,
            visitingNames,
            depth + 1,
            typeLabel,
            allowNull,
            allowUndefined
          )
        : buildStructureFromTypeNode(declaration.type, sourceFile, typeDeclarations, visitingNames, depth + 1);
      visitingNames.delete(typeName);
      if (resolved) {
        return declaration.kind === ts.SyntaxKind.TypeAliasDeclaration
          ? { ...resolved, typeLabel, allowNull, allowUndefined }
          : resolved;
      }
    }
  }

  return buildPrimitiveStructure(
    typeLabel,
    buildControlFromTypeNode(typeNode, sourceFile, typeDeclarations),
    buildOptionsFromTypeNode(typeNode, sourceFile, typeDeclarations),
    allowNull,
    allowUndefined
  );
}

export function buildStructureFromType(
  type: ts.Type,
  checker: ts.TypeChecker,
  seen: Set<string>,
  depth: number
): SimulatorStructureNode | undefined {
  if (depth > 8) {
    return undefined;
  }

  const typeLabel = checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation);
  const allowNull = typeAllowsNull(type);
  const allowUndefined = typeAllowsUndefined(type);
  const coreType = unwrapNullableType(type);
  const coreTypeLabel = checker.typeToString(coreType, undefined, ts.TypeFormatFlags.NoTruncation);

  if (checker.isTupleType(coreType)) {
    const items = checker
      .getTypeArguments(coreType as ts.TypeReference)
      .map((item) => buildStructureFromType(item, checker, seen, depth + 1))
      .filter((item): item is SimulatorStructureNode => !!item);
    return { kind: "tuple", typeLabel, items, allowNull, allowUndefined };
  }

  if (checker.isArrayType(coreType)) {
    const itemType = getArrayElementType(coreType, checker);
    if (!itemType) {
      return undefined;
    }
    const item = buildStructureFromType(itemType, checker, seen, depth + 1);
    if (!item) {
      return undefined;
    }
    return { kind: "array", typeLabel, item, allowNull, allowUndefined };
  }

  if (coreType.flags & ts.TypeFlags.Object) {
    if (seen.has(coreTypeLabel)) {
      return undefined;
    }
    seen.add(coreTypeLabel);
    const properties: Record<string, SimulatorStructureNode> = {};
    for (const property of checker.getPropertiesOfType(coreType)) {
      const declaration = property.valueDeclaration ?? property.declarations?.[0];
      if (!declaration) {
        continue;
      }
      const propertyType = checker.getTypeOfSymbolAtLocation(property, declaration);
      const child = buildStructureFromType(propertyType, checker, seen, depth + 1);
      if (child) {
        properties[property.getName()] = child;
      }
    }
    seen.delete(coreTypeLabel);
    return { kind: "object", typeLabel, properties, allowNull, allowUndefined };
  }

  const inputMode = buildInputModeFromType(type, checker);
  return buildPrimitiveStructure(typeLabel, inputMode.control, inputMode.options, allowNull, allowUndefined);
}

function buildStructureFromMembers(
  members: ts.NodeArray<ts.TypeElement>,
  sourceFile: ts.SourceFile,
  typeDeclarations: Map<string, TypeDeclaration>,
  visitingNames: Set<string>,
  depth: number,
  typeLabel: string,
  allowNull: boolean,
  allowUndefined: boolean
): SimulatorStructureNode {
  const properties: Record<string, SimulatorStructureNode> = {};
  for (const member of members) {
    if (!ts.isPropertySignature(member) || !member.name || !member.type) {
      continue;
    }
    const key = getPropertyName(member.name, sourceFile);
    if (!key) {
      continue;
    }
    const child = buildStructureFromTypeNode(member.type, sourceFile, typeDeclarations, visitingNames, depth + 1);
    if (child) {
      properties[key] = child;
    }
  }
  return { kind: "object", typeLabel, properties, allowNull, allowUndefined };
}

function buildPrimitiveStructure(
  typeLabel: string,
  control: LanguageParameterField["control"] | undefined,
  options: Array<{ label: string; value: string }> | undefined,
  allowNull: boolean,
  allowUndefined: boolean
): SimulatorStructureNode {
  return {
    kind: "primitive",
    typeLabel,
    ...(control ? { control } : {}),
    ...(options && options.length > 0 ? { options } : {}),
    allowNull,
    allowUndefined
  };
}
