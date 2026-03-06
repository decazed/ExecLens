# Execlens

IDE plugin to simulate function execution directly from the editor.

## Project Structure

- `packages/protocol`
- `packages/core`
- `packages/adapters/ide/vscode`
- `packages/adapters/language/tsjs`
- `packages/adapters/runtime/node`
- `packages/ui`

## Getting Started

```bash
pnpm install
pnpm build
```

## Test the VS Code Extension

1. Start the `Run Execlens Extension` debug configuration from `Run and Debug`.
2. In the `Extension Development Host` window, open the Command Palette.
3. Run the command `Execlens: Open Simulator`.

## Quality Checks (Optional)

```bash
pnpm typecheck
```
