# Execlens Architecture

Execlens follows a hexagonal architecture: the domain and use cases live in the
center, while IDEs, language analyzers, runtimes, and UI surfaces are adapters.

## Package Roles

| Package | Role | Allowed dependencies |
| --- | --- | --- |
| `@execlens/protocol` | Stable contracts and ports shared by all packages (v1, see [Protocol](PROTOCOL.md)). | None |
| `@execlens/core` | Use cases and orchestration. | `@execlens/protocol` only |
| `@execlens/adapter-tsjs` | TypeScript/JavaScript function analysis. | `@execlens/protocol`, TypeScript compiler APIs |
| `@execlens/adapter-node-runtime` | Node.js runtime execution. | `@execlens/protocol`, Node/TypeScript runtime APIs |
| `@execlens/ui` | Webview HTML/CSS/JS rendering. | `@execlens/protocol` only |
| `@execlens/ide-vscode` | VS Code composition root. | `core`, `protocol`, UI, and concrete adapters |

## Dependency Rules

Core rules:

- `protocol` must never import from another workspace package.
- `core` must never import adapters, UI, IDE APIs, TypeScript compiler APIs, or Node runtime APIs.
- Language adapters implement `LanguageAdapter`; they do not orchestrate simulations.
- Runtime adapters implement `RuntimeAdapter`; they do not build user-facing simulation traces.
- IDE adapters are composition roots. They wire concrete adapters into core use cases.
- UI renders and collects simulator input. It does not analyze code or execute functions.

Run the boundary check before opening a pull request:

```bash
pnpm architecture:check
```

## Main Ports

`LanguageAdapter`

- `id`: stable identifier, e.g. `"tsjs"`.
- `canAnalyze(languageId)`: whether the adapter handles a given IDE language id.
- `analyzeFunctionAtCursor(input)`: IDE-neutral document text, cursor offset, and
  document symbols in; function name and parameter fields out.
- Implemented by language packages such as `@execlens/adapter-tsjs`.

`RuntimeAdapter`

- `id`: stable identifier, e.g. `"node"`.
- `canRun(target)`: whether the adapter can execute a given simulation target.
- `execute(request, signal?)`: simulation target and positional arguments in;
  low-level execution result out.
- Implemented by runtime packages such as `@execlens/adapter-node-runtime`.

## Adapter Selection

Composition roots hold a set of adapters, not a single one. `core` exposes
`selectLanguageAdapter(adapters, languageId)` and
`selectRuntimeAdapter(adapters, target)`, which return the first adapter whose
`canAnalyze` / `canRun` accepts the input, or `null`. This keeps selection
IDE-neutral and lets an IDE adapter register several language or runtime adapters
without special-casing any of them.

## Current VS Code Flow

1. VS Code maps `vscode.DocumentSymbol` to `LanguageDocumentSymbol`.
2. VS Code picks a language adapter with `selectLanguageAdapter()` and calls
   `analyzeFunctionContext()` from `core` with it.
3. UI renders the returned `SimulatorFunctionInfo`.
4. The panel posts `execlens.runSimulation`.
5. VS Code picks a runtime adapter with `selectRuntimeAdapter()` and calls
   `simulateFunction()` from `core` with it.
6. Core builds duration, trace, success/failure result.
7. UI renders the simulation result.

## Extension Points

The project is intentionally open-ended. New support should usually be added as
a new adapter package rather than by adding special cases to core.

Examples:

- `packages/adapters/language/python`
- `packages/adapters/language/java`
- `packages/adapters/ide/jetbrains`
- `packages/adapters/runtime/browser`
- `packages/adapters/runtime/python`

If a new feature needs a new cross-adapter concept, add the contract to
`@execlens/protocol` first, then add the orchestration behavior to
`@execlens/core`.
