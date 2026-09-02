import * as vscode from "vscode";
import { selectRuntimeAdapter, simulateFunction } from "@execlens/core";
import type { RuntimeAdapter, SimulationRequest, SimulationResult, SimulatorFunctionInfo } from "@execlens/protocol";
import { renderSimulatorWebviewHtml } from "./webview/simulator-webview.js";

export type OpenSimulatorPanelInput = {
  functionInfo: SimulatorFunctionInfo;
  runtimeAdapters: readonly RuntimeAdapter[];
};

type RunSimulationMessage = {
  type: "execlens.runSimulation";
  payload?: {
    requestId?: unknown;
    target?: unknown;
    args?: unknown;
  };
};

type CancelSimulationMessage = {
  type: "execlens.cancelSimulation";
  payload?: {
    requestId?: unknown;
  };
};

type SimulatorPanelMessage = RunSimulationMessage | CancelSimulationMessage;

export function openSimulatorPanel(input: OpenSimulatorPanelInput): vscode.WebviewPanel {
  const panel = vscode.window.createWebviewPanel(
    "execlens.simulator",
    "Execlens Simulator",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true
    }
  );

  const controller = new SimulatorPanelController(panel, input.runtimeAdapters);
  panel.webview.html = renderSimulatorWebviewHtml(panel.webview, input.functionInfo);
  controller.start();
  return panel;
}

class SimulatorPanelController {
  private currentAbortController: AbortController | null = null;
  private currentRequestId: string | null = null;

  public constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly runtimeAdapters: readonly RuntimeAdapter[]
  ) {}

  public start(): void {
    this.panel.webview.onDidReceiveMessage((message: SimulatorPanelMessage) => {
      void this.handleMessage(message);
    });

    this.panel.onDidDispose(() => {
      this.abortCurrentSimulation();
    });
  }

  private async handleMessage(message: SimulatorPanelMessage): Promise<void> {
    if (message?.type === "execlens.cancelSimulation") {
      this.handleCancelSimulation(message);
      return;
    }

    if (message?.type === "execlens.runSimulation") {
      await this.handleRunSimulation(message);
    }
  }

  private handleCancelSimulation(message: CancelSimulationMessage): void {
    const requestId = typeof message.payload?.requestId === "string" ? message.payload.requestId : null;
    if (requestId && this.currentAbortController && this.currentRequestId === requestId) {
      this.currentAbortController.abort();
    }
  }

  private async handleRunSimulation(message: RunSimulationMessage): Promise<void> {
    const requestId = typeof message.payload?.requestId === "string" ? message.payload.requestId : null;
    const request = toSimulationRequest(message.payload);
    if (!requestId || !request) {
      return;
    }

    const runtimeAdapter = selectRuntimeAdapter(this.runtimeAdapters, request.target);
    if (!runtimeAdapter) {
      await this.panel.webview.postMessage({
        type: "execlens.simulationResult",
        payload: { requestId, result: noRuntimeAdapterResult(request) }
      });
      return;
    }

    this.currentAbortController = new AbortController();
    this.currentRequestId = requestId;

    try {
      const result = await simulateFunction(runtimeAdapter, request, this.currentAbortController.signal);

      const cancelled = result.ok === false && (result.reason === "cancelled" || result.errorName === "AbortError");
      if (cancelled && this.currentRequestId === requestId) {
        await this.panel.webview.postMessage({
          type: "execlens.simulationCancelled",
          payload: { requestId }
        });
        return;
      }

      if (this.currentRequestId !== requestId) {
        return;
      }

      await this.panel.webview.postMessage({
        type: "execlens.simulationResult",
        payload: {
          requestId,
          result
        }
      });
    } finally {
      if (this.currentRequestId === requestId) {
        this.currentAbortController = null;
        this.currentRequestId = null;
      }
    }
  }

  private abortCurrentSimulation(): void {
    this.currentAbortController?.abort();
    this.currentAbortController = null;
    this.currentRequestId = null;
  }
}

function noRuntimeAdapterResult(request: SimulationRequest): SimulationResult {
  return {
    ok: false,
    durationMs: 0,
    errorName: "NoRuntimeAdapter",
    errorMessage: `No runtime adapter can run ${request.target.filePath}.`,
    trace: []
  };
}

function toSimulationRequest(payload: RunSimulationMessage["payload"]): SimulationRequest | null {
  if (!payload || !isSimulationTarget(payload.target) || !isRecord(payload.args)) {
    return null;
  }

  return {
    target: payload.target,
    args: payload.args
  };
}

function isSimulationTarget(value: unknown): value is SimulationRequest["target"] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.kind === "function" &&
    typeof value.filePath === "string" &&
    typeof value.functionName === "string" &&
    Array.isArray(value.parameterNames) &&
    value.parameterNames.every((name) => typeof name === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
