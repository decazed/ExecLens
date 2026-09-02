import type {
  RuntimeAdapter,
  RuntimeExecutionRequest,
  RuntimeExecutionResult,
  SimulationAbortSignal,
  SimulationTarget
} from "@execlens/protocol";
import { executeInChildProcess } from "./child-process-runner.js";
import { cleanupExecutionArtifact, isSupportedFile, prepareExecutionArtifact } from "./execution-artifact.js";
import { toRuntimeExecutionFailure } from "./errors.js";

const DEFAULT_TIMEOUT_MS = 10_000;

export class NodeRuntimeAdapter implements RuntimeAdapter {
  public readonly id = "node";

  public constructor(private readonly timeoutMs = DEFAULT_TIMEOUT_MS) {}

  public canRun(target: SimulationTarget): boolean {
    return target.kind === "function" && isSupportedFile(target.filePath);
  }

  public async execute(
    request: RuntimeExecutionRequest,
    signal?: SimulationAbortSignal
  ): Promise<RuntimeExecutionResult> {
    try {
      const executionArtifact = await prepareExecutionArtifact(request.target.filePath);
      try {
        return await executeInChildProcess(
          {
            moduleSpecifier: executionArtifact.moduleSpecifier,
            functionName: request.target.functionName,
            args: request.positionalArgs,
            timeoutMs: request.timeoutMs ?? this.timeoutMs
          },
          signal
        );
      } finally {
        await cleanupExecutionArtifact(executionArtifact);
      }
    } catch (error) {
      return toRuntimeExecutionFailure(error);
    }
  }
}
