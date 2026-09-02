import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import type { LanguageDocumentSymbol, LanguageFunctionInfo, LanguageParameterField } from "@execlens/protocol";
import { analyzeFunctionAtCursor } from "@execlens/adapter-tsjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const playgroundWorkspaceRoot = path.join(repoRoot, "playground", "languages", "tsjs");

describe("playground language analysis golden scenarios", () => {
  it("detects primitive TypeScript controls and nullable flags", async () => {
    const nullableString = await analyzePlaygroundFunction("src/01-ts-input-primitives.ts", "nullableString");
    const optionalString = await analyzePlaygroundFunction("src/01-ts-input-primitives.ts", "optionalString");
    const parseBoolean = await analyzePlaygroundFunction("src/01-ts-input-primitives.ts", "parseBoolean");
    const parseLiteralMode = await analyzePlaygroundFunction("src/01-ts-input-primitives.ts", "parseLiteralMode");
    const parseEnumState = await analyzePlaygroundFunction("src/01-ts-input-primitives.ts", "parseEnumState");

    expect(singleParameter(nullableString)).toMatchObject({
      name: "value",
      typeLabel: "string | null",
      editor: "value",
      control: "text",
      allowNull: true
    });
    expect(singleParameter(optionalString)).toMatchObject({
      name: "value",
      typeLabel: "string | undefined",
      editor: "value",
      control: "text",
      allowUndefined: true
    });
    expect(singleParameter(parseBoolean)).toMatchObject({
      name: "flag",
      typeLabel: "boolean",
      editor: "value",
      control: "boolean",
      initialValue: "false"
    });
    expect(singleParameter(parseLiteralMode)).toMatchObject({
      name: "mode",
      editor: "value",
      control: "select",
      options: [
        { label: "draft", value: "draft" },
        { label: "published", value: "published" },
        { label: "archived", value: "archived" }
      ]
    });
    expect(singleParameter(parseEnumState)).toMatchObject({
      name: "state",
      typeLabel: "PublishState",
      editor: "value",
      control: "select",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
        { label: "Archived", value: "archived" }
      ]
    });
  });

  it("detects structured TypeScript inputs from playground types", async () => {
    const sumNumbers = await analyzePlaygroundFunction("src/02-ts-input-structures.ts", "sumNumbers");
    const tupleRange = await analyzePlaygroundFunction("src/02-ts-input-structures.ts", "tupleRange");
    const summarizeCheckout = await analyzePlaygroundFunction("src/02-ts-input-structures.ts", "summarizeCheckout");

    expect(singleParameter(sumNumbers)).toMatchObject({
      name: "values",
      typeLabel: "number[]",
      editor: "json",
      structure: {
        kind: "array",
        item: { kind: "primitive", typeLabel: "number" }
      }
    });
    expect(JSON.parse(singleParameter(sumNumbers).initialValue)).toEqual([0]);

    expect(singleParameter(tupleRange)).toMatchObject({
      name: "range",
      typeLabel: "[number, number]",
      editor: "json",
      structure: {
        kind: "tuple",
        items: [
          { kind: "primitive", typeLabel: "number" },
          { kind: "primitive", typeLabel: "number" }
        ]
      }
    });
    expect(JSON.parse(singleParameter(tupleRange).initialValue)).toEqual([0, 0]);

    const checkout = singleParameter(summarizeCheckout);
    expect(checkout).toMatchObject({
      name: "input",
      typeLabel: "CheckoutInput",
      editor: "json",
      structure: {
        kind: "object",
        properties: {
          customer: {
            kind: "object",
            properties: {
              id: { kind: "primitive", typeLabel: "string" },
              contact: {
                kind: "object",
                properties: {
                  email: { kind: "primitive", typeLabel: "string" }
                }
              },
              tags: {
                kind: "array",
                item: { kind: "primitive", typeLabel: "string" }
              }
            }
          },
          lines: {
            kind: "array",
            item: {
              kind: "object",
              properties: {
                sku: { kind: "primitive", typeLabel: "string" },
                quantity: { kind: "primitive", typeLabel: "number" },
                unitPrice: {
                  kind: "object",
                  properties: {
                    amount: { kind: "primitive", typeLabel: "number" },
                    currency: {
                      kind: "primitive",
                      control: "select",
                      options: [
                        { label: "EUR", value: "EUR" },
                        { label: "USD", value: "USD" }
                      ]
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    expect(JSON.parse(checkout.initialValue)).toMatchObject({
      customer: {
        id: "",
        contact: { email: "" },
        tags: [""]
      },
      lines: [
        {
          sku: "",
          quantity: 0,
          unitPrice: { amount: 0, currency: "EUR" }
        }
      ]
    });
  });

  it("resolves imported TypeScript types from local module graphs", async () => {
    const calculatePrice = await analyzePlaygroundFunction("src/07-ts-imports-and-local-modules.ts", "calculatePrice");

    expect(calculatePrice.parameters).toHaveLength(5);
    expect(calculatePrice.parameters[0]).toMatchObject({
      name: "cart",
      typeLabel: "CheckoutCart",
      editor: "json",
      structure: {
        kind: "object",
        properties: {
          lines: {
            kind: "array",
            item: {
              kind: "object",
              properties: {
                unitPrice: {
                  kind: "object",
                  properties: {
                    amount: { kind: "primitive", typeLabel: "number" },
                    currency: {
                      kind: "primitive",
                      control: "select",
                      options: [
                        { label: "EUR", value: "EUR" },
                        { label: "USD", value: "USD" }
                      ]
                    }
                  }
                }
              }
            }
          },
          customer: {
            kind: "object",
            properties: {
              email: { kind: "primitive", typeLabel: "string" },
              shippingAddress: {
                kind: "object",
                properties: {
                  country: { kind: "primitive", typeLabel: "string" }
                }
              }
            }
          },
          shippingMethod: {
            kind: "primitive",
            control: "select",
            options: [
              { label: "standard", value: "standard" },
              { label: "express", value: "express" }
            ]
          }
        }
      }
    });
    expect(calculatePrice.parameters[1]).toMatchObject({
      name: "payment",
      typeLabel: "PaymentInput",
      editor: "json",
      structure: {
        kind: "object",
        properties: {
          method: {
            kind: "primitive",
            control: "select",
            options: [
              { label: "card", value: "card" },
              { label: "paypal", value: "paypal" }
            ]
          },
          installments: { kind: "primitive", typeLabel: "number" }
        }
      }
    });
    expect(calculatePrice.parameters[3]).toMatchObject({
      name: "flags",
      typeLabel: "PricingFlags",
      editor: "json",
      structure: {
        kind: "object",
        properties: {
          includeVat: { kind: "primitive", control: "boolean" },
          roundResult: { kind: "primitive", control: "boolean" },
          locale: {
            kind: "primitive",
            control: "select",
            options: [
              { label: "fr-FR", value: "fr-FR" },
              { label: "en-US", value: "en-US" }
            ]
          }
        }
      }
    });
  });

  it("keeps runtime-native TypeScript signatures inspectable", async () => {
    const dateYear = await analyzePlaygroundFunction("src/03-ts-input-runtime-values.ts", "dateYear");
    const classInstanceLabel = await analyzePlaygroundFunction(
      "src/03-ts-input-runtime-values.ts",
      "classInstanceLabel"
    );

    expect(singleParameter(dateYear)).toMatchObject({
      name: "date",
      typeLabel: "Date",
      editor: "value",
      initialValue: "2026-01-01T00:00:00.000Z"
    });
    expect(singleParameter(classInstanceLabel)).toMatchObject({
      name: "user",
      typeLabel: "UserProfile",
      editor: "json",
      structure: {
        kind: "object",
        properties: {
          id: { kind: "primitive", typeLabel: "string" },
          name: { kind: "primitive", typeLabel: "string" }
        }
      }
    });
  });

  it("detects class instance and static method signatures", async () => {
    const withVat = await analyzePlaygroundFunction("src/08-ts-exports-reexports-and-classes.ts", "withVat");
    const round = await analyzePlaygroundFunction("src/08-ts-exports-reexports-and-classes.ts", "round");

    expect(withVat).toEqual({
      name: "withVat",
      parameters: [
        {
          name: "amount",
          typeLabel: "number",
          editor: "value",
          initialValue: "0",
          control: "text",
          allowNull: false,
          allowUndefined: false
        }
      ]
    });
    expect(round).toEqual({
      name: "round",
      parameters: [
        {
          name: "amount",
          typeLabel: "number",
          editor: "value",
          initialValue: "0",
          control: "text",
          allowNull: false,
          allowUndefined: false
        }
      ]
    });
  });

  it("documents pure reexport entrypoints as unresolved without an implementation symbol", async () => {
    await expect(analyzePlaygroundFunction("src/09-ts-reexport-entry.ts", "reexportedDirect")).rejects.toThrow(
      'Function "reexportedDirect" not found'
    );
  });

  it("falls back to unknown parameter fields for JavaScript playground functions", async () => {
    const jsAdd = await analyzePlaygroundFunction("src/14-js-specific-runtime.js", "jsAdd", "javascript");

    expect(jsAdd).toEqual({
      name: "jsAdd",
      parameters: [
        {
          name: "a",
          typeLabel: "unknown",
          editor: "value",
          initialValue: "",
          control: "text"
        },
        {
          name: "b",
          typeLabel: "unknown",
          editor: "value",
          initialValue: "",
          control: "text"
        }
      ]
    });
  });
});

async function analyzePlaygroundFunction(
  relativeFilePath: string,
  functionName: string,
  languageId = "typescript"
): Promise<LanguageFunctionInfo> {
  const fileName = path.join(playgroundWorkspaceRoot, relativeFilePath);
  const documentText = await readFile(fileName, "utf-8");
  const symbol = getFunctionSymbol(documentText, fileName, functionName);
  const result = analyzeFunctionAtCursor({
    documentText,
    fileName,
    languageId,
    cursorOffset: Math.max(symbol.rangeStart, documentText.indexOf("{", symbol.rangeStart) + 1),
    symbols: [symbol]
  });

  if (!result) {
    throw new Error(`Expected "${functionName}" to be analyzed.`);
  }

  return result;
}

function singleParameter(functionInfo: LanguageFunctionInfo): LanguageParameterField {
  expect(functionInfo.parameters).toHaveLength(1);
  const parameter = functionInfo.parameters[0];
  if (!parameter) {
    throw new Error(`Expected "${functionInfo.name}" to have one parameter.`);
  }
  return parameter;
}

function getFunctionSymbol(source: string, fileName: string, functionName: string): LanguageDocumentSymbol {
  const scriptKind = fileName.endsWith(".js") ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, scriptKind);
  let functionNode: ts.FunctionDeclaration | ts.MethodDeclaration | undefined;

  const visit = (node: ts.Node): void => {
    if (
      (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
      node.name?.getText(sourceFile) === functionName
    ) {
      functionNode = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  if (!functionNode) {
    throw new Error(`Function "${functionName}" not found in ${fileName}.`);
  }

  return {
    name: functionName,
    kind: "function",
    rangeStart: functionNode.getStart(sourceFile),
    rangeEnd: functionNode.getEnd(),
    children: []
  };
}
