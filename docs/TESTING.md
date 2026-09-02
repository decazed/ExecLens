# Testing

Execlens uses Vitest for automated tests. Tests live under `test/` and mirror the
project structure they cover.

## Commands

```bash
pnpm test
```

Runs the full Vitest suite.

```bash
pnpm test:unit
```

Runs package-level tests under `test/packages`.

```bash
pnpm test:playground
```

Runs language/runtime playground tests under `test/playground`.

```bash
pnpm test:ui
```

Runs UI-focused tests under `test/packages/ui`.

```bash
pnpm test:coverage
```

Runs the full Vitest suite with coverage thresholds.

```bash
pnpm quality
```

Runs architecture checks, TypeScript project references, tests, and build.

## Test Layout

```txt
test/
  packages/
    core/
    adapters/
    ui/
  playground/
    languages/
      tsjs/
  mocks/
```

Package tests mirror source package paths. For example:

```txt
packages/core/src/simulation-engine.ts
test/packages/core/src/simulation-engine.test.ts
```

Playground tests mirror shared language playgrounds:

```txt
playground/languages/tsjs
test/playground/languages/tsjs
```

## Playground Tests

The shared TS/JS playground is:

```txt
playground/languages/tsjs
```

It is IDE-neutral. It contains code scenarios that should be reusable by VS Code,
JetBrains, Neovim, or any future IDE adapter.

Current automated playground tests:

- `playground-analysis.test.ts`: golden tests for TS/JS function analysis.
- `playground-runtime.test.ts`: runtime scenarios executed through the Node runtime adapter.
- `scenarios.ts`: runtime scenario manifest.

When adding a TS/JS scenario:

1. Add or update a file under `playground/languages/tsjs/src`.
2. Add a runtime case to `test/playground/languages/tsjs/scenarios.ts` if it should execute.
3. Add a golden assertion to `playground-analysis.test.ts` if it changes expected analysis behavior.
4. Run `pnpm test:playground`.

## UI Tests

UI tests use jsdom. They verify generated webview HTML, form validation,
message posting, result rendering, and unsupported-target behavior.

Use the `// @vitest-environment jsdom` pragma on DOM tests.

## VS Code Tests

The VS Code adapter is tested with mocked `vscode` APIs under
`test/packages/adapters/ide/vscode`.

Electron-based end-to-end tests are intentionally not enabled right now. They are
heavier, slower, and require a downloaded VS Code build. Reintroduce them when
the extension behavior needs full IDE-level regression coverage.

## Coverage

Coverage is collected from production source files under `packages/**/src`.
Current thresholds are defined in `vitest.config.ts`.

Coverage should protect behavior without forcing artificial tests. If a new test
only exists to increase a percentage and does not clarify expected behavior, do
not add it.
