import * as vscode from "vscode";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RuntimeAdapter, SimulationAbortSignal } from "@execlens/protocol";
import { openSimulatorPanel } from "../../../../../../packages/adapters/ide/vscode/src/simulator-panel.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("openSimulatorPanel", () => {
  it("creates a webview panel and posts simulation results", async () => {
    const { panel, messageHandlers } = createPanel();
    vi.spyOn(vscode.window, "createWebviewPanel").mockReturnValue(panel as never);
    const runtimeAdapter: RuntimeAdapter = {
      id: "test",
      canRun: vi.fn(() => true),
      execute: vi.fn(async () => ({ ok: true, returnValue: 5 }))
    };

    const returnedPanel = openSimulatorPanel({
      functionInfo: {
        name: "add",
        target: createTarget(),
        parameters: []
      },
      runtimeAdapters: [runtimeAdapter]
    });

    expect(returnedPanel).toBe(panel);
    expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
      "execlens.simulator",
      "Execlens Simulator",
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );
    expect(panel.webview.html).toContain("add");

    messageHandlers[0]?.({
      type: "execlens.runSimulation",
      payload: {
        requestId: "request-1",
        target: createTarget(),
        args: { a: 2, b: 3 }
      }
    });

    await vi.waitFor(() => {
      expect(panel.webview.postMessage).toHaveBeenCalledWith({
        type: "execlens.simulationResult",
        payload: {
          requestId: "request-1",
          result: expect.objectContaining({
            ok: true,
            returnValue: 5
          })
        }
      });
    });
    expect(runtimeAdapter.execute).toHaveBeenCalledWith(
      {
        target: createTarget(),
        positionalArgs: [2, 3]
      },
      expect.any(Object)
    );
  });

  it("cancels the current simulation when a matching cancel message is received", async () => {
    const { panel, messageHandlers } = createPanel();
    vi.spyOn(vscode.window, "createWebviewPanel").mockReturnValue(panel as never);
    const runtimeAdapter: RuntimeAdapter = {
      id: "test",
      canRun: vi.fn(() => true),
      execute: vi.fn(
        async (_request, signal?: SimulationAbortSignal) =>
          new Promise((resolve) => {
            signal?.addEventListener("abort", () => {
              resolve({
                ok: false,
                errorName: "AbortError",
                errorMessage: "Simulation stopped by user."
              });
            });
          })
      )
    };

    openSimulatorPanel({
      functionInfo: {
        name: "add",
        target: createTarget(),
        parameters: []
      },
      runtimeAdapters: [runtimeAdapter]
    });

    messageHandlers[0]?.({
      type: "execlens.runSimulation",
      payload: {
        requestId: "request-2",
        target: createTarget(),
        args: { a: 2, b: 3 }
      }
    });
    await vi.waitFor(() => expect(runtimeAdapter.execute).toHaveBeenCalled());

    messageHandlers[0]?.({
      type: "execlens.cancelSimulation",
      payload: {
        requestId: "request-2"
      }
    });

    await vi.waitFor(() => {
      expect(panel.webview.postMessage).toHaveBeenCalledWith({
        type: "execlens.simulationCancelled",
        payload: { requestId: "request-2" }
      });
    });
  });

  it("ignores malformed run messages", async () => {
    const { panel, messageHandlers } = createPanel();
    vi.spyOn(vscode.window, "createWebviewPanel").mockReturnValue(panel as never);
    const runtimeAdapter: RuntimeAdapter = {
      id: "test",
      canRun: vi.fn(() => true),
      execute: vi.fn(async () => ({ ok: true, returnValue: null }))
    };

    openSimulatorPanel({
      functionInfo: {
        name: "add",
        target: createTarget(),
        parameters: []
      },
      runtimeAdapters: [runtimeAdapter]
    });

    messageHandlers[0]?.({
      type: "execlens.runSimulation",
      payload: {
        requestId: "request-3",
        target: { kind: "function", filePath: 42 },
        args: {}
      }
    });

    await Promise.resolve();
    expect(runtimeAdapter.execute).not.toHaveBeenCalled();
    expect(panel.webview.postMessage).not.toHaveBeenCalled();
  });

  it("posts a NoRuntimeAdapter failure when no runtime adapter can run the target", async () => {
    const { panel, messageHandlers } = createPanel();
    vi.spyOn(vscode.window, "createWebviewPanel").mockReturnValue(panel as never);
    const runtimeAdapter: RuntimeAdapter = {
      id: "test",
      canRun: vi.fn(() => false),
      execute: vi.fn(async () => ({ ok: true, returnValue: null }))
    };

    openSimulatorPanel({
      functionInfo: {
        name: "add",
        target: createTarget(),
        parameters: []
      },
      runtimeAdapters: [runtimeAdapter]
    });

    messageHandlers[0]?.({
      type: "execlens.runSimulation",
      payload: {
        requestId: "request-4",
        target: createTarget(),
        args: { a: 2, b: 3 }
      }
    });

    await vi.waitFor(() => {
      expect(panel.webview.postMessage).toHaveBeenCalledWith({
        type: "execlens.simulationResult",
        payload: {
          requestId: "request-4",
          result: expect.objectContaining({ ok: false, errorName: "NoRuntimeAdapter" })
        }
      });
    });
    expect(runtimeAdapter.execute).not.toHaveBeenCalled();
  });
});

function createPanel(): {
  panel: {
    webview: {
      cspSource: string;
      html: string;
      onDidReceiveMessage: ReturnType<typeof vi.fn>;
      postMessage: ReturnType<typeof vi.fn>;
    };
    onDidDispose: ReturnType<typeof vi.fn>;
  };
  messageHandlers: Array<(message: unknown) => void>;
  disposeHandlers: Array<() => void>;
} {
  const messageHandlers: Array<(message: unknown) => void> = [];
  const disposeHandlers: Array<() => void> = [];
  const panel = {
    webview: {
      cspSource: "vscode-resource:",
      html: "",
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => void) => {
        messageHandlers.push(handler);
        return { dispose() {} };
      }),
      postMessage: vi.fn(async () => true)
    },
    onDidDispose: vi.fn((handler: () => void) => {
      disposeHandlers.push(handler);
      return { dispose() {} };
    })
  };

  return { panel, messageHandlers, disposeHandlers };
}

function createTarget() {
  return {
    kind: "function" as const,
    filePath: "sample.ts",
    functionName: "add",
    parameterNames: ["a", "b"]
  };
}
