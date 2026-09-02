import type {
  LanguageAdapter,
  LanguageAnalysisInput,
  LanguageFunctionInfo,
  LanguageParameterField
} from "@execlens/protocol";

/**
 * IDE language ids this adapter handles (see `editor.document.languageId` in the
 * VS Code adapter, or the equivalent in another IDE). Replace with the real ids.
 */
const LANGUAGE_IDS = ["example", "examplereact"];

/**
 * Template language adapter.
 *
 * A language adapter turns "there is a function under the cursor" into a
 * `LanguageFunctionInfo`: the function name and one input field per parameter.
 * It must not execute code, render UI, or import `@execlens/core`, an IDE, or a
 * runtime adapter. It may depend on `@execlens/protocol` and on a
 * parser/compiler/LSP for its language.
 *
 * To build a real adapter:
 * 1. Copy this folder to `packages/adapters/language/<your-language-id>`.
 * 2. Rename the package in `package.json` and update `LANGUAGE_IDS` + `id`.
 * 3. Add the new `tsconfig.json` path to the root `tsconfig.json` `references`.
 * 4. Implement `analyzeFunctionAtCursor` (see the TODOs below).
 * 5. Register an instance in each IDE composition root's adapter list.
 * 6. Add scenarios under `playground/languages/<your-language-id>` and tests
 *    under `test/playground/languages/<your-language-id>`.
 */
export class TemplateLanguageAdapter implements LanguageAdapter {
  public readonly id = "language-template";

  public canAnalyze(languageId: string): boolean {
    return LANGUAGE_IDS.includes(languageId);
  }

  public analyzeFunctionAtCursor(input: LanguageAnalysisInput): LanguageFunctionInfo | null {
    // `input` provides IDE-neutral context:
    // - `documentText`  full source of the file
    // - `fileName`      absolute path
    // - `languageId`    the IDE language id (already matched by `canAnalyze`)
    // - `cursorOffset`  caret position as a character offset into `documentText`
    // - `symbols`       document symbols from the IDE; may be empty, so an
    //                   adapter should still try to work from `documentText`
    void input;

    // TODO: locate the innermost function whose range contains `cursorOffset`.
    // Return `null` when the cursor is not inside a supported function.
    const functionName: string | null = null;
    if (functionName === null) {
      return null;
    }

    // TODO: describe each parameter as a `LanguageParameterField`. Start simple
    // (`editor: "value"`, `control: "text"`) and add structured / enum / select
    // handling as the language's type information allows.
    const parameters: LanguageParameterField[] = [];

    return { name: functionName, parameters };
  }
}
