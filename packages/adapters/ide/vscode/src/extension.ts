import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand("execlens.openSimulator", () => {
    const panel = vscode.window.createWebviewPanel(
      "execlens.simulator",
      "Execlens Simulator",
      vscode.ViewColumn.Beside,
      {}
    );

    panel.webview.html = "<h1>Hello Execlens</h1>";
  });

  context.subscriptions.push(disposable);
}

export function desactivate(): void {}
