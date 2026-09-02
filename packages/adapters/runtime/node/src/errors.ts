import type { RuntimeExecutionFailure, RuntimeFailureReason } from "@execlens/protocol";

export function toRuntimeExecutionFailure(error: unknown, fallbackName = "SimulationError"): RuntimeExecutionFailure {
  const errorName = error instanceof Error ? error.name : fallbackName;
  return {
    ok: false,
    errorName,
    errorMessage: error instanceof Error ? error.message : String(error),
    reason: reasonFromErrorName(errorName),
    ...(error instanceof Error && error.stack ? { stack: error.stack } : {})
  };
}

function reasonFromErrorName(errorName: string): RuntimeFailureReason {
  if (errorName === "TimeoutError") {
    return "timeout";
  }
  if (errorName === "AbortError") {
    return "cancelled";
  }
  return "error";
}
