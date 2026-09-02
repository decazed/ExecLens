import * as vscode from "vscode";
import { afterEach, describe, expect, it, vi } from "vitest";
import { activate, deactivate } from "../../../../../../packages/adapters/ide/vscode/src/extension.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("extension lifecycle", () => {
  it("registers the simulator command and editor listeners", async () => {
    const subscriptions: Array<{ dispose(): void }> = [];
    vi.spyOn(vscode.commands, "executeCommand").mockResolvedValue(undefined);
    vi.spyOn(vscode.commands, "registerCommand").mockReturnValue({ dispose: vi.fn() });
    vi.spyOn(vscode.window, "onDidChangeActiveTextEditor").mockReturnValue({ dispose: vi.fn() });
    vi.spyOn(vscode.window, "onDidChangeTextEditorSelection").mockReturnValue({ dispose: vi.fn() });

    activate({ subscriptions } as never);

    expect(vscode.commands.registerCommand).toHaveBeenCalledWith("execlens.openSimulator", expect.any(Function));
    expect(vscode.window.onDidChangeActiveTextEditor).toHaveBeenCalledWith(expect.any(Function));
    expect(vscode.window.onDidChangeTextEditorSelection).toHaveBeenCalledWith(expect.any(Function));
    expect(subscriptions).toHaveLength(3);
    await vi.waitFor(() => {
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "setContext",
        "execlens.isFunctionUnderCursor",
        false
      );
    });
  });

  it("has a no-op deactivate hook", () => {
    expect(deactivate()).toBeUndefined();
  });
});
