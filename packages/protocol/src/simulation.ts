/**
 * What to simulate. `kind` is a discriminated union so new target shapes can be
 * added later; `"function"` is the only kind in v1.
 */
export type SimulationTarget = {
  kind: "function";
  filePath: string;
  functionName: string;
  parameterNames: string[];
};

/** A simulation request from the UI: a target plus arguments keyed by name. */
export type SimulationRequest = {
  target: SimulationTarget;
  args: Record<string, unknown>;
};

/** A runtime adapter's input: a target plus positional arguments and a timeout. */
export type RuntimeExecutionRequest = {
  target: SimulationTarget;
  positionalArgs: unknown[];
  timeoutMs?: number;
};

/** A runtime adapter returned a value. */
export type RuntimeExecutionSuccess = {
  ok: true;
  returnValue: unknown;
};

/** A runtime adapter failed (threw, timed out, was cancelled, or could not run). */
export type RuntimeExecutionFailure = {
  ok: false;
  errorName: string;
  errorMessage: string;
  stack?: string;
};

/** The low-level result a runtime adapter produces. `core` normalizes it. */
export type RuntimeExecutionResult = RuntimeExecutionSuccess | RuntimeExecutionFailure;

/** An ordered event in a simulation trace. */
export type SimulationTraceEvent =
  | { type: "start"; at: number }
  | { type: "return"; at: number; value: unknown }
  | { type: "throw"; at: number; errorName: string; errorMessage: string };

/** A normalized successful simulation, with duration and trace, built by `core`. */
export type SimulationSuccess = {
  ok: true;
  durationMs: number;
  returnValue: unknown;
  trace: SimulationTraceEvent[];
};

/** A normalized failed simulation, with duration and trace, built by `core`. */
export type SimulationFailure = {
  ok: false;
  durationMs: number;
  errorName: string;
  errorMessage: string;
  stack?: string;
  trace: SimulationTraceEvent[];
};

/** The user-facing result of a simulation. */
export type SimulationResult = SimulationSuccess | SimulationFailure;

/**
 * Implemented by runtime packages (e.g. `@execlens/adapter-node-runtime`). A
 * runtime adapter executes a target; it does not build user-facing traces.
 */
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

/**
 * A structural subset of the DOM `AbortSignal`, used to cancel a running
 * simulation without depending on a DOM lib. A real `AbortSignal` satisfies it.
 */
export type SimulationAbortSignal = {
  aborted: boolean;
  addEventListener(type: "abort", listener: () => void, options?: { once?: boolean }): void;
  removeEventListener(type: "abort", listener: () => void): void;
};
