import type {
  RuntimeAdapter,
  RuntimeExecutionFailure,
  RuntimeExecutionRequest,
  RuntimeExecutionResult,
  SimulationAbortSignal,
  SimulationRequest,
  SimulationResult
} from "@execlens/protocol";

export type SimulationEngineOptions = {
  timeoutMs?: number;
  now?: () => number;
};

export class SimulationEngine {
  private readonly now: () => number;

  public constructor(
    private readonly runtimeAdapter: RuntimeAdapter,
    private readonly options: SimulationEngineOptions = {}
  ) {
    this.now = options.now ?? Date.now;
  }

  public async simulate(request: SimulationRequest, signal?: SimulationAbortSignal): Promise<SimulationResult> {
    const startedAt = this.now();

    try {
      const runtimeRequest = createRuntimeExecutionRequest(request, this.options.timeoutMs);
      const executionResult = await this.runtimeAdapter.execute(runtimeRequest, signal);
      return createSimulationResult(executionResult, startedAt, this.now());
    } catch (error) {
      return createSimulationResult(toRuntimeExecutionFailure(error), startedAt, this.now());
    }
  }
}

export async function simulateFunction(
  runtimeAdapter: RuntimeAdapter,
  request: SimulationRequest,
  signal?: SimulationAbortSignal
): Promise<SimulationResult> {
  return new SimulationEngine(runtimeAdapter).simulate(request, signal);
}

export function createRuntimeExecutionRequest(
  request: SimulationRequest,
  timeoutMs?: number
): RuntimeExecutionRequest {
  return {
    target: request.target,
    positionalArgs: request.target.parameterNames.map((name) => request.args[name]),
    ...(typeof timeoutMs === "number" ? { timeoutMs } : {})
  };
}

function createSimulationResult(
  executionResult: RuntimeExecutionResult,
  startedAt: number,
  finishedAt: number
): SimulationResult {
  if (executionResult.ok) {
    return {
      ok: true,
      durationMs: finishedAt - startedAt,
      returnValue: executionResult.returnValue,
      trace: [
        { type: "start", at: startedAt },
        { type: "return", at: finishedAt, value: executionResult.returnValue }
      ]
    };
  }

  return {
    ok: false,
    durationMs: finishedAt - startedAt,
    errorName: executionResult.errorName,
    errorMessage: executionResult.errorMessage,
    ...(executionResult.stack ? { stack: executionResult.stack } : {}),
    trace: [
      { type: "start", at: startedAt },
      {
        type: "throw",
        at: finishedAt,
        errorName: executionResult.errorName,
        errorMessage: executionResult.errorMessage
      }
    ]
  };
}

function toRuntimeExecutionFailure(error: unknown): RuntimeExecutionFailure {
  return {
    ok: false,
    errorName: error instanceof Error ? error.name : "SimulationError",
    errorMessage: error instanceof Error ? error.message : String(error),
    ...(error instanceof Error && error.stack ? { stack: error.stack } : {})
  };
}
