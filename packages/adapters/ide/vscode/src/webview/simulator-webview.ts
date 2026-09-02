import * as vscode from "vscode";
import type { SimulatorFunctionInfo } from "@execlens/protocol";
import { renderSimulatorPanelHtml } from "@execlens/ui";

export function renderSimulatorWebviewHtml(
  webview: vscode.Webview,
  functionInfo: SimulatorFunctionInfo
): string {
  return renderSimulatorPanelHtml({
    cspSource: webview.cspSource,
    nonce: createNonce(),
    functionInfo
  });
}

function createNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 16; i += 1) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
