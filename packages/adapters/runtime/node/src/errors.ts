import type { RuntimeExecutionFailure } from "@execlens/protocol";

export function toRuntimeExecutionFailure(error: unknown, fallbackName = "SimulationError"): RuntimeExecutionFailure {
  return {
    ok: false,
    errorName: error instanceof Error ? error.name : fallbackName,
    errorMessage: error instanceof Error ? error.message : String(error),
    ...(error instanceof Error && error.stack ? { stack: error.stack } : {})
  };
}
