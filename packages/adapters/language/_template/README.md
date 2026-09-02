# Language adapter template

A minimal, buildable starting point for a new Execlens language adapter. It is
kept compiling by CI so it does not rot; it is not wired into any IDE.

Read [`docs/ADAPTERS.md`](../../../../docs/ADAPTERS.md) and
[`docs/ARCHITECTURE.md`](../../../../docs/ARCHITECTURE.md) first.

## What a language adapter does

Given IDE-neutral context (document text, file name, language id, cursor offset,
document symbols) it returns a `LanguageFunctionInfo`: the name of the function
under the cursor and one `LanguageParameterField` per parameter. It does **not**
execute code, render UI, or import `@execlens/core`, an IDE package, or a runtime
adapter.

## Steps

1. **Copy** this folder to `packages/adapters/language/<language-id>` (e.g.
   `packages/adapters/language/python`).
2. **Rename** in `package.json`: `name` to `@execlens/adapter-<language-id>`, and
   set a real `description`. Bump `version` to `0.1.0` if you like.
3. In `src/index.ts`, set `id` and `LANGUAGE_IDS` to real values, and rename the
   class.
4. Add `{ "path": "./packages/adapters/language/<language-id>" }` to the root
   [`tsconfig.json`](../../../../tsconfig.json) `references` so it is typechecked
   and built.
5. Implement `analyzeFunctionAtCursor`. Add a parser/compiler/LSP dependency to
   `package.json` if you need one; keep the only workspace dependency
   `@execlens/protocol` (enforced by `pnpm architecture:check`).
6. **Register** an instance in each IDE composition root's language adapter list
   (for VS Code: `packages/adapters/ide/vscode/src/extension.ts`). Selection is
   automatic via `canAnalyze` / `selectLanguageAdapter`.
7. Add IDE-neutral scenarios under `playground/languages/<language-id>` and tests
   under `test/playground/languages/<language-id>` (mirror the tsjs layout).
8. `pnpm quality`.
