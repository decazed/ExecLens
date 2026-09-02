const form = document.getElementById("run-form");
const output = document.getElementById("run-output");
const runButton = document.getElementById("run-button");
const stopButton = document.getElementById("stop-button");
const vscode = typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : null;
const functionInfo = readFunctionInfo();
let currentRequestId = null;
let isRunning = false;

renderOutputState({
  tone: "neutral",
  title: "Ready",
  message: "Click Run to execute the function with the current parameters."
});

function readFunctionInfo() {
  const node = document.getElementById("execlens-function-info");
  if (!node) {
    return null;
  }

  try {
    return JSON.parse(node.textContent ?? "null");
  } catch (error) {
    renderOutputState({
      tone: "error",
      title: "Panel Init Error",
      message: error instanceof Error ? error.message : String(error),
      raw: {
        status: "panel-init-error",
        message: error instanceof Error ? error.message : String(error)
      }
    });
    return null;
  }
}

function setRunningState(nextRunning) {
  isRunning = nextRunning;
  if (runButton) {
    runButton.disabled = nextRunning;
  }
  if (stopButton) {
    stopButton.disabled = !nextRunning;
  }
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (isRunning) {
    return;
  }

  const fields = Array.from(form.querySelectorAll("[data-param-name]"));
  const { params, errors } = validateAllFields(fields);

  if (errors.length > 0) {
    renderOutputState({
      tone: "error",
      title: "Invalid Input",
      message: "Some parameters are invalid. Fix the highlighted fields.",
      primaryLabel: "Errors",
      primaryValue: errors,
      raw: {
        status: "invalid-input",
        message: "Some parameters are invalid. Fix the highlighted fields.",
        errors
      }
    });
    return;
  }

  if (!vscode || !functionInfo?.target) {
    renderOutputState({
      tone: "error",
      title: "Unsupported Target",
      message: "Function execution is not available for this target yet.",
      primaryLabel: "Parameters",
      primaryValue: params,
      raw: {
        status: "unsupported",
        message: "Function execution is not available for this target yet.",
        parameters: params
      }
    });
    return;
  }

  currentRequestId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  setRunningState(true);

  renderOutputState({
    tone: "pending",
    title: "Running",
    message: "Simulation is running with the current parameters.",
    meta: [functionInfo.name, currentRequestId],
    primaryLabel: "Parameters",
    primaryValue: params,
    raw: {
      status: "running",
      requestId: currentRequestId,
      function: functionInfo.name,
      parameters: params
    }
  });

  vscode.postMessage({
    type: "execlens.runSimulation",
    payload: {
      requestId: currentRequestId,
      target: functionInfo.target,
      args: params
    }
  });
});

stopButton?.addEventListener("click", () => {
  if (!vscode || !currentRequestId || !isRunning) {
    return;
  }

  renderOutputState({
    tone: "pending",
    title: "Stopping",
    message: "Stopping simulation...",
    meta: [currentRequestId],
    raw: {
      status: "stopping",
      requestId: currentRequestId,
      message: "Stopping simulation..."
    }
  });

  vscode.postMessage({
    type: "execlens.cancelSimulation",
    payload: {
      requestId: currentRequestId
    }
  });
});

window.addEventListener("message", (event) => {
  const message = event.data;
  if (!message) {
    return;
  }

  if (message.type === "execlens.simulationResult") {
    if (message.payload?.requestId !== currentRequestId) {
      return;
    }

    setRunningState(false);
    currentRequestId = null;
    renderSimulationResult(message.payload.result);
    return;
  }

  if (message.type === "execlens.simulationCancelled") {
    if (message.payload?.requestId !== currentRequestId) {
      return;
    }

    setRunningState(false);
    currentRequestId = null;
    renderOutputState({
      tone: "neutral",
      title: "Cancelled",
      message: "Simulation stopped by user.",
      raw: {
        status: "cancelled",
        message: "Simulation stopped by user."
      }
    });
  }
});

setRunningState(false);
attachLiveValidation();

function renderSimulationResult(result) {
  if (result?.ok) {
    renderOutputState({
      tone: "success",
      title: "Completed",
      message: "Simulation finished successfully.",
      meta: [`${result.durationMs}ms`, `${result.trace?.length ?? 0} trace events`],
      primaryLabel: "Return Value",
      primaryValue: result.returnValue,
      secondaryLabel: "Trace",
      secondaryValue: result.trace,
      secondaryMode: "trace",
      raw: toDisplayResult(result)
    });
    return;
  }

  renderOutputState({
    tone: "error",
    title: result?.errorName ?? "Failed",
    message: result?.errorMessage ?? "Simulation failed.",
    meta: [typeof result?.durationMs === "number" ? `${result.durationMs}ms` : "no duration"],
    primaryLabel: "Error",
    primaryValue: {
      name: result?.errorName ?? "SimulationError",
      message: result?.errorMessage ?? "Unknown error"
    },
    secondaryLabel: "Trace",
    secondaryValue: result?.trace ?? [],
    secondaryMode: "trace",
    raw: toDisplayResult(result)
  });
}
