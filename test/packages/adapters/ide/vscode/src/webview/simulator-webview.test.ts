import { describe, expect, it } from "vitest";
import { renderSimulatorWebviewHtml } from "../../../../../../../packages/adapters/ide/vscode/src/webview/simulator-webview.js";

describe("renderSimulatorWebviewHtml", () => {
  it("renders the simulator panel with the webview CSP source", () => {
    const html = renderSimulatorWebviewHtml(
      { cspSource: "vscode-resource:" } as never,
      {
        name: "add",
        parameters: []
      }
    );

    expect(html).toContain("vscode-resource:");
    expect(html).toContain("add");
    expect(html).toMatch(/nonce="[A-Za-z0-9]{16}"/);
  });
});
