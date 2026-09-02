import type {
  RuntimeAdapter,
  RuntimeExecutionRequest,
  RuntimeExecutionResult,
  SimulationAbortSignal
} from "@execlens/protocol";
import { executeInChildProcess } from "./child-process-runner.js";
import { cleanupExecutionArtifact, prepareExecutionArtifact } from "./execution-artifact.js";
import { toRuntimeExecutionFailure } from "./errors.js";

const DEFAULT_TIMEOUT_MS = 10_000;

export class NodeRuntimeAdapter implements RuntimeAdapter {
  public constructor(private readonly timeoutMs = DEFAULT_TIMEOUT_MS) {}

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
