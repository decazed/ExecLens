/**
 * `@execlens/protocol` — the stable v1 contract surface shared by every Execlens
 * package and by third-party adapters.
 *
 * Stability policy for the `1.x` line:
 *
 * - Adding a new exported type, or a new **optional** field to an existing type,
 *   is a minor release.
 * - Removing or renaming an export, removing a field, making an optional field
 *   required, or narrowing a type is a breaking change and will not happen in
 *   `1.x`.
 * - The set of exports below is pinned by a contract test
 *   (`test/packages/protocol/src/surface.test.ts`).
 *
 * See `docs/PROTOCOL.md`.
 */
export type {
  LanguageAdapter,
  LanguageAnalysisInput,
  LanguageDocumentSymbol,
  LanguageFunctionInfo,
  LanguageParameterField,
  LanguageSymbolKind,
  MaybePromise
} from "./language.js";
export type {
  FunctionParameterField,
  ParameterFieldOption,
  ParameterStructureNode
} from "./parameters.js";
export type {
  RuntimeAdapter,
  RuntimeExecutionFailure,
  RuntimeExecutionRequest,
  RuntimeExecutionResult,
  RuntimeExecutionSuccess,
  RuntimeFailureReason,
  SimulationAbortSignal,
  SimulationFailure,
  SimulationRequest,
  SimulationResult,
  SimulationSuccess,
  SimulationTarget,
  SimulationTraceEvent
} from "./simulation.js";
export type {
  SimulatorFieldOption,
  SimulatorFunctionInfo,
  SimulatorParameterField,
  SimulatorStructureNode
} from "./simulator.js";
