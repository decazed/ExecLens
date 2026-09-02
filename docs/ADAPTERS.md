# Adding Adapters

This document explains how contributors should add support for new languages,
IDEs, and runtimes without weakening package boundaries.

## Add a Language Adapter

Create a package under `packages/adapters/language/<name>`.

It should:

- depend on `@execlens/protocol`
- implement `LanguageAdapter`
- export a concrete adapter class, for example `PythonLanguageAdapter`
- return IDE-neutral `LanguageFunctionInfo`
- keep language-specific compiler/parser logic inside the adapter

It should not:

- import from `@execlens/core`
- import from IDE packages
- execute user code
- render UI

Minimal shape:

```ts
import type { LanguageAdapter, LanguageAnalysisInput, LanguageFunctionInfo } from "@execlens/protocol";

export class ExampleLanguageAdapter implements LanguageAdapter {
  public analyzeFunctionAtCursor(input: LanguageAnalysisInput): LanguageFunctionInfo | null {
    // Parse/analyze the source file and return a function description.
    return null;
  }
}
```

## Add an IDE Adapter

Create a package under `packages/adapters/ide/<name>`.

It should:

- map IDE-specific symbols to `LanguageDocumentSymbol`
- wire concrete language/runtime adapters into `core`
- host or embed the UI surface if the IDE needs one
- keep IDE APIs inside the IDE adapter package

It should not:

- parse language-specific syntax directly
- execute user code directly
- add IDE concepts to `core`

IDE adapters are allowed to depend on concrete adapters because they are
composition roots.

## Add a Runtime Adapter

Create a package under `packages/adapters/runtime/<name>`.

It should:

- depend on `@execlens/protocol`
- implement `RuntimeAdapter`
- return `RuntimeExecutionResult`
- enforce runtime-specific timeout/cancellation behavior when possible

It should not:

- build `SimulationResult`
- build traces
- render output
- depend on IDE APIs

`core` converts a `RuntimeExecutionResult` into the user-facing
`SimulationResult`.

## When To Change Protocol

Change `@execlens/protocol` when multiple adapters need a shared concept.

Good examples:

- a new kind of simulation target
- a new parameter editor capability
- a common trace event
- a common adapter port

Avoid adding implementation details to protocol. If only one adapter needs a
detail, keep it in that adapter.

## When To Change Core

Change `@execlens/core` when there is domain orchestration that should be shared
by every IDE/runtime/language.

Good examples:

- simulation lifecycle
- result normalization
- trace construction
- adapter-independent validation

Avoid adding stack-specific behavior to core. If a feature mentions VS Code,
TypeScript, Node.js, Python, or a specific framework, it probably belongs in an
adapter.
