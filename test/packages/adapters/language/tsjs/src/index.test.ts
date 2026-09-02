import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ts from "typescript";
import { afterEach, describe, expect, it } from "vitest";
import type { LanguageDocumentSymbol } from "@execlens/adapter-tsjs";
import { TsJsLanguageAdapter, analyzeFunctionAtCursor } from "@execlens/adapter-tsjs";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("TsJsLanguageAdapter", () => {
  it("advertises its id and the TS/JS language ids it can analyze", () => {
    const adapter = new TsJsLanguageAdapter();

    expect(adapter.id).toBe("tsjs");
    expect(adapter.canAnalyze("typescript")).toBe(true);
    expect(adapter.canAnalyze("typescriptreact")).toBe(true);
    expect(adapter.canAnalyze("javascript")).toBe(true);
    expect(adapter.canAnalyze("javascriptreact")).toBe(true);
    expect(adapter.canAnalyze("python")).toBe(false);
  });

  it("returns null when the cursor is outside function symbols", () => {
    const source = "const value = 1;";

    expect(
      new TsJsLanguageAdapter().analyzeFunctionAtCursor({
        documentText: source,
        fileName: "sample.ts",
        languageId: "typescript",
        cursorOffset: 0,
        symbols: []
      })
    ).toBeNull();
  });

  it("extracts primitive, literal-union and structured TypeScript parameters", async () => {
    const { fileName } = await createTypeScriptProject();
    const source = [
      'type Mode = "fast" | "safe";',
      "interface User {",
      "  name: string;",
      "  age: number;",
      "  tags: string[];",
      "}",
      "",
      "export function register(user: User, mode: Mode, enabled: boolean | null): string {",
      "  return enabled ? user.name : mode;",
      "}"
    ].join("\n");
    const symbol = getFunctionSymbol(source, fileName, "register");

    const result = analyzeFunctionAtCursor({
      documentText: source,
      fileName,
      languageId: "typescript",
      cursorOffset: source.indexOf("return enabled"),
      symbols: [symbol]
    });

    expect(result?.name).toBe("register");
    expect(result?.parameters).toHaveLength(3);
    expect(result?.parameters[0]).toMatchObject({
      name: "user",
      typeLabel: "User",
      editor: "json",
      structure: {
        kind: "object",
        properties: {
          name: { kind: "primitive", typeLabel: "string" },
          age: { kind: "primitive", typeLabel: "number" },
          tags: { kind: "array", item: { kind: "primitive", typeLabel: "string" } }
        }
      }
    });
    expect(JSON.parse(result?.parameters[0]?.initialValue ?? "{}")).toEqual({
      name: "",
      age: 0,
      tags: [""]
    });
    expect(result?.parameters[1]).toMatchObject({
      name: "mode",
      typeLabel: "Mode",
      editor: "value",
      control: "select",
      options: [
        { label: "fast", value: "fast" },
        { label: "safe", value: "safe" }
      ]
    });
    expect(result?.parameters[2]).toMatchObject({
      name: "enabled",
      typeLabel: "boolean | null",
      editor: "value",
      control: "boolean",
      allowNull: true
    });
  });

  it("falls back to declaration parsing for unsupported languages", () => {
    const source = "function legacy(a, b = 1, ...rest) {\n  return a;\n}";
    const symbol: LanguageDocumentSymbol = {
      name: "legacy",
      kind: "function",
      rangeStart: 0,
      rangeEnd: source.length,
      children: []
    };

    const result = analyzeFunctionAtCursor({
      documentText: source,
      fileName: "legacy.custom",
      languageId: "unknown",
      cursorOffset: source.indexOf("return"),
      symbols: [symbol]
    });

    expect(result?.parameters.map((parameter) => parameter.name)).toEqual(["a", "b", "rest"]);
    expect(result?.parameters.every((parameter) => parameter.typeLabel === "unknown")).toBe(true);
  });

  it("builds structured parameter editors from AST when no tsconfig is available", () => {
    const fileName = path.join(os.tmpdir(), "execlens-ast-only.ts");
    const source = [
      "type Choice = 'auto' | 'manual';",
      "export function configure(",
      "  options: { enabled: boolean; retries: number; mode: Choice; nested: { label: string } },",
      "  tags: string[],",
      "  pair: [string, number],",
      "  maybe: string | undefined",
      "): void {",
      "  console.log(options, tags, pair, maybe);",
      "}"
    ].join("\n");
    const symbol = getFunctionSymbol(source, fileName, "configure");

    const result = analyzeFunctionAtCursor({
      documentText: source,
      fileName,
      languageId: "typescript",
      cursorOffset: source.indexOf("console.log"),
      symbols: [symbol]
    });

    expect(result?.parameters[0]).toMatchObject({
      name: "options",
      editor: "json",
      structure: {
        kind: "object",
        properties: {
          enabled: { kind: "primitive", control: "boolean" },
          retries: { kind: "primitive", typeLabel: "number" },
          mode: {
            kind: "primitive",
            control: "select",
            options: [
              { label: "auto", value: "auto" },
              { label: "manual", value: "manual" }
            ]
          },
          nested: {
            kind: "object",
            properties: {
              label: { kind: "primitive", typeLabel: "string" }
            }
          }
        }
      }
    });
    expect(result?.parameters[1]).toMatchObject({
      name: "tags",
      editor: "json",
      structure: {
        kind: "array",
        item: { kind: "primitive", typeLabel: "string" }
      }
    });
    expect(result?.parameters[2]).toMatchObject({
      name: "pair",
      editor: "json",
      structure: {
        kind: "tuple",
        items: [
          { kind: "primitive", typeLabel: "string" },
          { kind: "primitive", typeLabel: "number" }
        ]
      }
    });
    expect(result?.parameters[3]).toMatchObject({
      name: "maybe",
      editor: "value",
      allowUndefined: true
    });
  });

  it("resolves nested generic TypeScript aliases through the type checker", async () => {
    const { fileName } = await createTypeScriptProject();
    const source = [
      "type Box<T> = { value: T; items: T[] };",
      "type Envelope<TPayload> = { payload: TPayload; status: 'ok' | 'error' };",
      "type User = { id: string; active: boolean };",
      "",
      "export function consumeEnvelope(envelope: Envelope<Box<User>>): string {",
      "  return envelope.payload.value.id;",
      "}"
    ].join("\n");
    const symbol = getFunctionSymbol(source, fileName, "consumeEnvelope");

    const result = analyzeFunctionAtCursor({
      documentText: source,
      fileName,
      languageId: "typescript",
      cursorOffset: source.indexOf("return envelope"),
      symbols: [symbol]
    });

    expect(result?.parameters).toHaveLength(1);
    expect(result?.parameters[0]).toMatchObject({
      name: "envelope",
      typeLabel: "Envelope<Box<User>>",
      editor: "json",
      structure: {
        kind: "object",
        properties: {
          payload: {
            kind: "object",
            properties: {
              value: {
                kind: "object",
                properties: {
                  id: { kind: "primitive", typeLabel: "string" },
                  active: { kind: "primitive", typeLabel: "boolean", control: "boolean" }
                }
              },
              items: {
                kind: "array",
                item: {
                  kind: "object",
                  properties: {
                    id: { kind: "primitive", typeLabel: "string" },
                    active: { kind: "primitive", typeLabel: "boolean", control: "boolean" }
                  }
                }
              }
            }
          },
          status: {
            kind: "primitive",
            control: "select",
            options: [
              { label: "ok", value: "ok" },
              { label: "error", value: "error" }
            ]
          }
        }
      }
    });
    expect(JSON.parse(result?.parameters[0]?.initialValue ?? "{}")).toEqual({
      payload: {
        value: {
          id: "",
          active: false
        },
        items: [
          {
            id: "",
            active: false
          }
        ]
      },
      status: "ok"
    });
  });

  it("selects the smallest nested function symbol under the cursor", () => {
    const fileName = path.join(os.tmpdir(), "execlens-nested.ts");
    const source = [
      "export function outer(value: string): string {",
      "  function inner(count: number): number {",
      "    return count + 1;",
      "  }",
      "  return `${value}-${inner(1)}`;",
      "}"
    ].join("\n");
    const outer = getFunctionSymbol(source, fileName, "outer");
    const inner = getFunctionSymbol(source, fileName, "inner");

    const result = analyzeFunctionAtCursor({
      documentText: source,
      fileName,
      languageId: "typescript",
      cursorOffset: source.indexOf("return count"),
      symbols: [{ ...outer, children: [inner] }]
    });

    expect(result?.name).toBe("inner");
    expect(result?.parameters).toMatchObject([{ name: "count", typeLabel: "number" }]);
  });
});

async function createTypeScriptProject(): Promise<{ fileName: string }> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "execlens-tsjs-test-"));
  tempDirs.push(tempDir);
  await writeFile(
    path.join(tempDir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true
      }
    }),
    "utf-8"
  );
  return { fileName: path.join(tempDir, "sample.ts") };
}

function getFunctionSymbol(source: string, fileName: string, functionName: string): LanguageDocumentSymbol {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let functionNode: ts.FunctionDeclaration | undefined;

  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === functionName) {
      functionNode = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  if (!functionNode) {
    throw new Error(`Function "${functionName}" not found in test source.`);
  }

  return {
    name: functionName,
    kind: "function",
    rangeStart: functionNode.getStart(sourceFile),
    rangeEnd: functionNode.getEnd(),
    children: []
  };
}
