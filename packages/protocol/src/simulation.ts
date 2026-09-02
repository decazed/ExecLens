export type SimulationTarget = {
  kind: "function";
  filePath: string;
  functionName: string;
  parameterNames: string[];
};

export type SimulationRequest = {
  target: SimulationTarget;
  args: Record<string, unknown>;
};

export type RuntimeExecutionRequest = {
  target: SimulationTarget;
  positionalArgs: unknown[];
  timeoutMs?: number;
};

export type RuntimeExecutionSuccess = {
  ok: true;
  returnValue: unknown;
};

export type RuntimeExecutionFailure = {
  ok: false;
  errorName: string;
  errorMessage: string;
  stack?: string;
};

export type RuntimeExecutionResult = RuntimeExecutionSuccess | RuntimeExecutionFailure;

export type SimulationTraceEvent =
  | { type: "start"; at: number }
  | { type: "return"; at: number; value: unknown }
  | { type: "throw"; at: number; errorName: string; errorMessage: string };

export type SimulationSuccess = {
  ok: true;
  durationMs: number;
  returnValue: unknown;
  trace: SimulationTraceEvent[];
};

export type SimulationFailure = {
  ok: false;
  durationMs: number;
  errorName: string;
  errorMessage: string;
  stack?: string;
  trace: SimulationTraceEvent[];
};

export type SimulationResult = SimulationSuccess | SimulationFailure;

export type RuntimeAdapter = {
  /** Stable identifier for this adapter, e.g. `"node"`. */
  readonly id: string;
  /**
   * Whether this adapter can execute the given target (for example based on the
   * target file extension or kind). A composition root uses this to pick an
   * adapter from a set.
   */
  canRun(target: SimulationTarget): boolean;
  execute(request: RuntimeExecutionRequest, signal?: SimulationAbortSignal): Promise<RuntimeExecutionResult>;
};

export type SimulationAbortSignal = {
  aborted: boolean;
  addEventListener(type: "abort", listener: () => void, options?: { once?: boolean }): void;
  removeEventListener(type: "abort", listener: () => void): void;
};
