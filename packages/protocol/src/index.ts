export type SimulatorFieldOption = {
  label: string;
  value: string;
};

export type SimulatorStructureNode =
  | {
      kind: "primitive";
      typeLabel: string;
      control?: "text" | "boolean" | "select";
      options?: SimulatorFieldOption[];
      allowNull?: boolean;
      allowUndefined?: boolean;
    }
  | {
      kind: "object";
      typeLabel: string;
      properties: Record<string, SimulatorStructureNode>;
      allowNull?: boolean;
      allowUndefined?: boolean;
    }
  | {
      kind: "array";
      typeLabel: string;
      item: SimulatorStructureNode;
      allowNull?: boolean;
      allowUndefined?: boolean;
    }
  | {
      kind: "tuple";
      typeLabel: string;
      items: SimulatorStructureNode[];
      allowNull?: boolean;
      allowUndefined?: boolean;
    };

export type SimulatorParameterField = {
  name: string;
  typeLabel: string;
  editor: "value" | "json";
  initialValue: string;
  control?: "text" | "boolean" | "select";
  options?: SimulatorFieldOption[];
  allowNull?: boolean;
  allowUndefined?: boolean;
  structure?: SimulatorStructureNode;
};

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
  run(request: SimulationRequest, signal?: SimulationAbortSignal): Promise<SimulationResult>;
};

export type SimulationAbortSignal = {
  aborted: boolean;
  addEventListener(type: "abort", listener: () => void, options?: { once?: boolean }): void;
  removeEventListener(type: "abort", listener: () => void): void;
};
