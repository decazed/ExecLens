# Protocol (`@execlens/protocol`)

`@execlens/protocol` is the contract every Execlens package and every third-party
adapter depends on. It contains **types only** — no runtime code. It is at
version **1.0.0**.

## Stability policy

For the whole `1.x` line:

- **Minor** release: a new exported type, or a new **optional** field on an
  existing type.
- **Not allowed in `1.x`** (would require `2.0.0`): removing or renaming an
  export, removing a field, making an optional field required, changing a field's
  type to something narrower, or adding a required member to `LanguageAdapter` or
  `RuntimeAdapter`.
- New `SimulationTarget.kind` values and new `SimulationTraceEvent.type` values
  are additive and land in a minor release.

The exact export set is pinned by
`test/packages/protocol/src/surface.test.ts`; changing it fails CI until the list
and this document are updated deliberately.

## The contract

### Language analysis

| Type | Purpose |
| --- | --- |
| `LanguageAdapter` | Port implemented by language packages. `id`, `canAnalyze(languageId)`, `analyzeFunctionAtCursor(input)`. |
| `LanguageAnalysisInput` | IDE-neutral context: document text, file name, language id, cursor offset, document symbols (may be empty). |
| `LanguageDocumentSymbol` / `LanguageSymbolKind` | IDE-neutral symbol tree with character-offset ranges. |
| `LanguageFunctionInfo` | Output: function `name` and `parameters`. |
| `LanguageParameterField` | Alias of `FunctionParameterField`. |
| `MaybePromise<T>` | `T | Promise<T>`. |

### Parameter fields

| Type | Purpose |
| --- | --- |
| `FunctionParameterField` | One editable input for a parameter: `editor` (`"value"` \| `"json"`), `initialValue`, optional `control` / `options` / `structure`. |
| `ParameterStructureNode` | Recursive shape of a structured value: `primitive` \| `object` \| `array` \| `tuple`. |
| `ParameterFieldOption` | `{ label, value }` for a `select` control. |

### Simulation

| Type | Purpose |
| --- | --- |
| `SimulationTarget` | What to run. `kind: "function"` in v1. |
| `SimulationRequest` | Target + args keyed by parameter name (from the UI). |
| `RuntimeAdapter` | Port implemented by runtime packages. `id`, `canRun(target)`, `execute(request, signal?)`. |
| `RuntimeExecutionRequest` | Target + positional args + optional `timeoutMs`. |
| `RuntimeExecutionResult` | `RuntimeExecutionSuccess` \| `RuntimeExecutionFailure` — the low-level result an adapter returns. |
| `SimulationResult` | `SimulationSuccess` \| `SimulationFailure` — normalized by `core` with `durationMs` and `trace`. |
| `SimulationTraceEvent` | `start` \| `return` \| `throw`. |
| `SimulationAbortSignal` | Structural subset of the DOM `AbortSignal` used for cancellation. |

### Simulator UI model

| Type | Purpose |
| --- | --- |
| `SimulatorFunctionInfo` | What the panel renders: `name`, `parameters`, optional resolved `target`. |
| `SimulatorParameterField` / `SimulatorStructureNode` / `SimulatorFieldOption` | Aliases of the parameter-field types. |

## Changing the protocol

Change `@execlens/protocol` only when **multiple** adapters need a shared concept
(a new target kind, a new parameter capability, a new trace event, a new port).
If only one adapter needs a detail, keep it in that adapter. Add the contract
first, then the orchestration in `@execlens/core`. See `docs/ADAPTERS.md`.
