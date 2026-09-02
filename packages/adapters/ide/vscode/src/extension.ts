import * as vscode from "vscode";
import { TsJsLanguageAdapter } from "@execlens/adapter-tsjs";
import { NodeRuntimeAdapter } from "@execlens/adapter-node-runtime";
import { VsCodeFunctionContextService } from "./function-context.js";
import { openSimulatorPanel } from "./simulator-panel.js";

const languageAdapters = [new TsJsLanguageAdapter()];
const runtimeAdapters = [new NodeRuntimeAdapter()];
const functionContextService = new VsCodeFunctionContextService(languageAdapters);

export function activate(context: vscode.ExtensionContext): void {
  const refreshFunctionContext = async (editor: vscode.TextEditor | undefined): Promise<void> => {
    const functionInfo = await functionContextService.analyzeCurrentFunction(editor);
    await vscode.commands.executeCommand("setContext", "execlens.isFunctionUnderCursor", Boolean(functionInfo));
  };

  const openSimulatorDisposable = vscode.commands.registerCommand("execlens.openSimulator", async () => {
    const functionInfo = await functionContextService.getFunctionInfoUnderCursor(vscode.window.activeTextEditor);
    openSimulatorPanel({
      functionInfo,
      runtimeAdapters
    });
  });

  void refreshFunctionContext(vscode.window.activeTextEditor);

  const activeEditorListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
    void refreshFunctionContext(editor);
  });

  const selectionListener = vscode.window.onDidChangeTextEditorSelection((event) => {
    void refreshFunctionContext(event.textEditor);
  });

  context.subscriptions.push(openSimulatorDisposable, activeEditorListener, selectionListener);
}

export function deactivate(): void {}
