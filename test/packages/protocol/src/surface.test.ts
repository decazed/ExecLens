import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const entry = path.join(repoRoot, "packages", "protocol", "src", "index.ts");

/**
 * The frozen v1 public surface of `@execlens/protocol`.
 *
 * Adding a name here is a minor release. Removing or renaming a name is a
 * breaking change and must not happen while the package is `1.x` — see
 * `docs/PROTOCOL.md` and the stability policy in `packages/protocol/src/index.ts`.
 */
const V1_EXPORTS = [
  "FunctionParameterField",
  "LanguageAdapter",
  "LanguageAnalysisInput",
  "LanguageDocumentSymbol",
  "LanguageFunctionInfo",
  "LanguageParameterField",
  "LanguageSymbolKind",
  "MaybePromise",
  "ParameterFieldOption",
  "ParameterStructureNode",
  "RuntimeAdapter",
  "RuntimeExecutionFailure",
  "RuntimeExecutionRequest",
  "RuntimeExecutionResult",
  "RuntimeExecutionSuccess",
  "SimulationAbortSignal",
  "SimulationFailure",
  "SimulationRequest",
  "SimulationResult",
  "SimulationSuccess",
  "SimulationTarget",
  "SimulationTraceEvent",
  "SimulatorFieldOption",
  "SimulatorFunctionInfo",
  "SimulatorParameterField",
  "SimulatorStructureNode"
] as const;

function getPublicExportNames(): string[] {
  const program = ts.createProgram([entry], {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    strict: true,
    noEmit: true
  });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(entry);
  if (!source) {
    throw new Error(`Unable to load ${entry}`);
  }
  const moduleSymbol = checker.getSymbolAtLocation(source);
  if (!moduleSymbol) {
    throw new Error("protocol entry point has no module symbol");
  }
  return checker
    .getExportsOfModule(moduleSymbol)
    .map((symbol) => symbol.getName())
    .sort();
}

describe("@execlens/protocol public surface", () => {
  it("matches the frozen v1 export set", () => {
    expect(getPublicExportNames()).toEqual([...V1_EXPORTS]);
  });

  it("exports only types (no runtime values)", async () => {
    const runtime = (await import("@execlens/protocol")) as Record<string, unknown>;
    expect(Object.keys(runtime)).toEqual([]);
  });
});
