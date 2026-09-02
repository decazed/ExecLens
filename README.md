# Execlens

Execlens is an IDE function execution simulator. The goal is to let a developer
place the cursor on a function, inspect generated inputs, run the function in a
controlled runtime, and read the result directly from the editor.

The project is designed to grow through adapters: new languages, IDEs, runtimes,
and UI surfaces should plug into stable contracts instead of changing the core.

## Status

This repository is still early. The current implementation focuses on:

- VS Code as the first IDE adapter
- TypeScript/JavaScript as the first language adapter
- Node.js as the first runtime adapter
- a webview-based simulator UI

## Packages

```txt
packages/
  protocol/                    shared contracts and ports
  core/                        stack-independent use cases
  adapters/
    ide/vscode/                VS Code composition root
    language/tsjs/             TypeScript/JavaScript analysis
    runtime/node/              Node.js execution
  ui/                          simulator webview rendering
```

## Architecture

Execlens follows a hexagonal architecture.

- `protocol` defines shared contracts.
- `core` orchestrates use cases and depends only on `protocol`.
- language adapters analyze code.
- runtime adapters execute code.
- IDE adapters wire concrete adapters together.
- UI renders simulator input/output.

Read:

- [Architecture](docs/ARCHITECTURE.md)
- [Adding adapters](docs/ADAPTERS.md)
- [Testing](docs/TESTING.md)
- [Contributing](CONTRIBUTING.md)

## Getting Started

```bash
pnpm install
pnpm build
```

## Development

Run the VS Code extension in development mode:

```bash
pnpm dev:vscode
```

Then start the `Run Execlens Extension` debug configuration from VS Code.

In the Extension Development Host:

1. Open `playground/languages/tsjs`.
2. Open a file under `src`.
3. Place the cursor inside a supported function.
4. Run `Execlens: Open Simulator` from the editor context menu.

## Tests

```bash
pnpm test
```

Runs the full Vitest suite.

```bash
pnpm test:unit
pnpm test:playground
pnpm test:ui
```

Run focused subsets.

```bash
pnpm test:coverage
pnpm quality
```

Run coverage and full quality checks.

Electron-based VS Code end-to-end tests are intentionally not enabled yet. The
VS Code adapter is currently covered with mocked `vscode` APIs, and the shared
TS/JS behavior is covered through playground analysis/runtime tests.

## Playground

Shared language playgrounds live under:

```txt
playground/languages/<language-id>
```

The current TS/JS playground is:

```txt
playground/languages/tsjs
```

These scenarios are IDE-neutral. Future IDE adapters should reuse the same
language playgrounds instead of duplicating code scenarios per IDE.

## Contributing

Before opening a pull request:

```bash
pnpm quality
```

If you change behavior or tests:

```bash
pnpm test:coverage
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for adapter boundaries, test layout, and
pull request guidance.

## Security

Execlens executes code from the workspace you open it in. Only run it on code you
trust. See [SECURITY.md](SECURITY.md) for the trust model and how to report a
vulnerability.

## License

[MIT](LICENSE) © decazed and Execlens contributors.
