# Contributing

Execlens is built around adapters. Contributions should keep the core small,
portable, and independent from IDE, language, runtime, and UI details.

## Before Opening a Pull Request

Run:

```bash
pnpm quality
```

For test-focused changes, also run:

```bash
pnpm test:coverage
```

## Architecture Rules

Read:

- [Architecture](docs/ARCHITECTURE.md)
- [Protocol](docs/PROTOCOL.md)
- [Adding adapters](docs/ADAPTERS.md)
- [Testing](docs/TESTING.md)

Core rules:

- `packages/protocol` contains shared contracts only.
- `packages/core` contains stack-independent orchestration only.
- language adapters do not import IDEs, runtimes, UI, or core.
- runtime adapters do not import IDEs, language adapters, UI, or core.
- IDE adapters are composition roots and can wire concrete adapters together.
- UI renders and collects input; it does not analyze code or execute functions.

## Adding a Language

Copy `packages/adapters/language/_template` to:

```txt
packages/adapters/language/<language-id>
```

and follow its `README.md`. The adapter implements `LanguageAdapter` from
`@execlens/protocol`.

Also add:

```txt
playground/languages/<language-id>
test/playground/languages/<language-id>
```

The playground should contain IDE-neutral source files for that language.

## Adding an IDE

Add a package under:

```txt
packages/adapters/ide/<ide-id>
```

The IDE adapter should:

- map IDE document symbols to `LanguageDocumentSymbol`
- provide document text, file name, language id, and cursor offset
- call core use cases with concrete language/runtime adapters
- keep all IDE APIs inside the IDE adapter package

It should not parse TS/JS, Python, Java, or any language-specific syntax itself.

## Adding a Runtime

Add a package under:

```txt
packages/adapters/runtime/<runtime-id>
```

The runtime adapter should implement `RuntimeAdapter` and return low-level
`RuntimeExecutionResult` values. Core is responsible for building
`SimulationResult`, traces, and duration.

## Tests

Put tests under `test/`, mirroring the source path or playground path.

Examples:

```txt
packages/adapters/language/tsjs/src/index.ts
test/packages/adapters/language/tsjs/src/index.test.ts

playground/languages/tsjs
test/playground/languages/tsjs
```

Use focused tests for narrow behavior and playground golden tests for realistic
language/runtime scenarios.

## Pull Request Shape

Prefer small, coherent pull requests:

- architecture refactor
- adapter feature
- playground coverage
- UI behavior
- docs-only update

Avoid mixing unrelated refactors with behavior changes.

## Workflow

- Branch from `develop` using `type/kebab-case-summary`, for example
  `feat/python-language-adapter` or `chore/add-ci-workflow`.
- Commit messages follow Conventional Commits: `type(scope): summary`, lowercase,
  no trailing period.
- Open the pull request against `develop`. Releases flow `develop` -> `main`.
- CI runs `pnpm quality` on every pull request; it must be green before merge.

## Licensing of Contributions

This project is licensed under the [MIT License](LICENSE). By submitting a
contribution, you agree that your contribution is licensed under the same terms.
There is no separate CLA to sign.
