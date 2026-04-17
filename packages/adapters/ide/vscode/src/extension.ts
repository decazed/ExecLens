import * as vscode from "vscode";
import { analyzeFunctionAtCursor, type LanguageFunctionInfo } from "@execlens/adapter-tsjs";
import { simulateFunction } from "@execlens/core";
import { NodeRuntimeAdapter } from "@execlens/adapter-node-runtime";
import type { SimulationRequest, SimulatorParameterField } from "@execlens/protocol";
import { renderSimulatorPanelHtml, type SimulatorFunctionInfo } from "@execlens/ui";
import { toLanguageSymbol } from "./mappers/document-symbol.mapper.js";

type FunctionInfo = SimulatorFunctionInfo;
const runtimeAdapter = new NodeRuntimeAdapter();

export function activate(context: vscode.ExtensionContext): void {
  const refreshFunctionContext = async (editor: vscode.TextEditor | undefined): Promise<void> => {
    const functionInfo = await analyzeCurrentFunction(editor);
    await vscode.commands.executeCommand("setContext", "execlens.isFunctionUnderCursor", Boolean(functionInfo));
  };

  const disposable = vscode.commands.registerCommand("execlens.openSimulator", async () => {
    const functionInfo = await getFunctionInfoUnderCursor();
    const panel = vscode.window.createWebviewPanel(
      "execlens.simulator",
      "Execlens Simulator",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true
      }
    );
    let currentAbortController: AbortController | null = null;
    let currentRequestId: string | null = null;

    panel.webview.html = getWebviewHtml(panel.webview, functionInfo);
    panel.webview.onDidReceiveMessage(async (message) => {
      if (message?.type === "execlens.cancelSimulation") {
        const requestId = typeof message.payload?.requestId === "string" ? message.payload.requestId : null;
        if (requestId && currentAbortController && currentRequestId === requestId) {
          currentAbortController.abort();
        }
        return;
      }

      if (message?.type !== "execlens.runSimulation") {
        return;
      }

      const request = message.payload
        ? ({
            target: message.payload.target,
            args: message.payload.args
          } satisfies SimulationRequest)
        : undefined;
      if (!request) {
        return;
      }

      const requestId = typeof message.payload?.requestId === "string" ? message.payload.requestId : null;
      if (!requestId) {
        return;
      }

      currentAbortController = new AbortController();
      currentRequestId = requestId;

      try {
        const result = await simulateFunction(runtimeAdapter, request, currentAbortController.signal);

        if (result.ok === false && result.errorName === "AbortError" && currentRequestId === requestId) {
          await panel.webview.postMessage({
            type: "execlens.simulationCancelled",
            payload: { requestId }
          });
          return;
        }

        if (currentRequestId !== requestId) {
          return;
        }

        await panel.webview.postMessage({
          type: "execlens.simulationResult",
          payload: {
            requestId,
            result
          }
        });
      } finally {
        if (currentRequestId === requestId) {
          currentAbortController = null;
          currentRequestId = null;
        }
      }
    });

    panel.onDidDispose(() => {
      currentAbortController?.abort();
      currentAbortController = null;
      currentRequestId = null;
    });
  });

  void refreshFunctionContext(vscode.window.activeTextEditor);

  const activeEditorListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
    void refreshFunctionContext(editor);
  });

  const selectionListener = vscode.window.onDidChangeTextEditorSelection((event) => {
    void refreshFunctionContext(event.textEditor);
  });

  context.subscriptions.push(disposable, activeEditorListener, selectionListener);
}

export function deactivate(): void {}

function getWebviewHtml(webview: vscode.Webview, functionInfo: FunctionInfo): string {
  const nonce = createNonce();
  return renderSimulatorPanelHtml({
    cspSource: webview.cspSource,
    nonce,
    functionInfo
  });
}

async function getFunctionInfoUnderCursor(): Promise<FunctionInfo> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return { name: "No active editor", parameters: [] };
  }

  const functionInfo = await analyzeCurrentFunction(editor);
  if (functionInfo) {
    return {
      ...functionInfo,
      target: {
        kind: "function",
        filePath: editor.document.fileName,
        functionName: functionInfo.name,
        parameterNames: functionInfo.parameters.map((parameter: SimulatorParameterField) => parameter.name)
      }
    };
  }

  const symbols = await getDocumentSymbols(editor.document.uri);
  return { name: symbols.length > 0 ? "No function under cursor" : "No function found", parameters: [] };
}

async function analyzeCurrentFunction(editor: vscode.TextEditor | undefined): Promise<LanguageFunctionInfo | null> {
  if (!editor) {
    return null;
  }

  const symbols = await getDocumentSymbols(editor.document.uri);
  if (symbols.length === 0) {
    return null;
  }

  const languageSymbols = symbols.map((symbol) => toLanguageSymbol(editor.document, symbol));
  return analyzeFunctionAtCursor({
    documentText: editor.document.getText(),
    fileName: editor.document.fileName,
    languageId: editor.document.languageId,
    cursorOffset: editor.document.offsetAt(editor.selection.active),
    symbols: languageSymbols
  });
}

async function getDocumentSymbols(documentUri: vscode.Uri): Promise<vscode.DocumentSymbol[]> {
  const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
    "vscode.executeDocumentSymbolProvider",
    documentUri
  );
  return symbols ?? [];
}

function createNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 16; i += 1) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
