import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import type {
  RuntimeAdapter,
  SimulationAbortSignal,
  SimulationRequest,
  SimulationResult,
} from "@execlens/protocol";

const DEFAULT_TIMEOUT_MS = 10_000;

export class NodeRuntimeAdapter implements RuntimeAdapter {
  public constructor(private readonly timeoutMs = DEFAULT_TIMEOUT_MS) {}

  public async run(
    request: SimulationRequest,
    signal?: SimulationAbortSignal
  ): Promise<SimulationResult> {
    const startedAt = Date.now();
    const args = request.target.parameterNames.map((name) => request.args[name]);

    try {
      const executionArtifact = await prepareExecutionArtifact(request.target.filePath);
      try {
        const payload = await executeInChildProcess(
          {
            moduleSpecifier: executionArtifact.moduleSpecifier,
            functionName: request.target.functionName,
            args,
            timeoutMs: this.timeoutMs,
          },
          signal
        );

        if (payload.ok) {
          return {
            ok: true,
            durationMs: Date.now() - startedAt,
            returnValue: payload.returnValue,
            trace: [
              { type: "start", at: startedAt },
              { type: "return", at: Date.now(), value: payload.returnValue },
            ],
          };
        }

        return {
          ok: false,
          durationMs: Date.now() - startedAt,
          errorName: payload.errorName,
          errorMessage: payload.errorMessage,
          ...(payload.stack ? { stack: payload.stack } : {}),
          trace: [
            { type: "start", at: startedAt },
            {
              type: "throw",
              at: Date.now(),
              errorName: payload.errorName,
              errorMessage: payload.errorMessage,
            },
          ],
        };
      } finally {
        if (executionArtifact.cleanupDir) {
          await rm(executionArtifact.cleanupDir, { recursive: true, force: true });
        }
      }
    } catch (error) {
      return {
        ok: false,
        durationMs: Date.now() - startedAt,
        errorName: error instanceof Error ? error.name : "SimulationError",
        errorMessage: error instanceof Error ? error.message : String(error),
        ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
        trace: [
          { type: "start", at: startedAt },
          {
            type: "throw",
            at: Date.now(),
            errorName: error instanceof Error ? error.name : "SimulationError",
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        ],
      };
    }
  }
}

type ExecutionArtifact = {
  moduleSpecifier: string;
  cleanupDir?: string;
};

async function prepareExecutionArtifact(filePath: string): Promise<ExecutionArtifact> {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".js" || extension === ".mjs" || extension === ".cjs") {
    return { moduleSpecifier: pathToFileURL(filePath).href };
  }

  if (extension === ".ts" || extension === ".mts" || extension === ".cts" || extension === ".tsx") {
    return transpileTypeScriptFile(filePath);
  }

  throw new Error(`Unsupported file type: ${extension || "unknown"}`);
}

async function transpileTypeScriptFile(filePath: string): Promise<ExecutionArtifact> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "execlens-runtime-"));
  const source = await readFile(filePath, "utf-8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filePath,
  });

  const outputPath = path.join(tempDir, `${path.basename(filePath, path.extname(filePath))}.mjs`);
  await writeFile(outputPath, transpiled.outputText, "utf-8");
  return {
    moduleSpecifier: pathToFileURL(outputPath).href,
    cleanupDir: tempDir,
  };
}

async function executeInChildProcess(
  input: {
    moduleSpecifier: string;
    functionName: string;
    args: unknown[];
    timeoutMs: number;
  },
  signal?: SimulationAbortSignal
): Promise<
  | { ok: true; returnValue: unknown }
  | { ok: false; errorName: string; errorMessage: string; stack?: string }
> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "execlens-runner-"));
  const runnerPath = path.join(tempDir, "runner.mjs");
  await writeFile(runnerPath, createRunnerSource(), "utf-8");

  return new Promise<
    | { ok: true; returnValue: unknown }
    | { ok: false; errorName: string; errorMessage: string; stack?: string }
  >((resolve, reject) => {
    const child = spawn(process.execPath, [runnerPath], { stdio: ["pipe", "pipe", "pipe"] });

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Simulation timed out after ${input.timeoutMs}ms.`));
    }, input.timeoutMs);

    const abortHandler = (): void => {
      clearTimeout(timer);
      child.kill();
      const error = new Error("Simulation stopped by user.");
      error.name = "AbortError";
      reject(error);
    };

    if (signal?.aborted) {
      abortHandler();
      return;
    }

    signal?.addEventListener("abort", abortHandler, { once: true });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abortHandler);
      reject(error);
    });

    child.on("close", () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abortHandler);

      if (stdout.trim().length === 0) {
        reject(new Error(stderr.trim() || "Runtime exited without output."));
        return;
      }

      try {
        resolve(
          JSON.parse(stdout) as
            | { ok: true; returnValue: unknown }
            | { ok: false; errorName: string; errorMessage: string; stack?: string }
        );
      } catch {
        reject(new Error(`Unable to parse runtime output: ${stdout}`));
      }
    });

    child.stdin.write(
      JSON.stringify({
        moduleSpecifier: input.moduleSpecifier,
        functionName: input.functionName,
        args: input.args,
      })
    );
    child.stdin.end();
  }).finally(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });
}

function createRunnerSource(): string {
  return `
const chunks = [];
for await (const chunk of process.stdin) {
  chunks.push(chunk);
}

const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));

try {
  const moduleNamespace = await import(input.moduleSpecifier);
  const target = moduleNamespace[input.functionName];
  if (typeof target !== "function") {
    throw new Error(\`Export "\${input.functionName}" was not found or is not a function.\`);
  }

  const returnValue = await target(...input.args);
  process.stdout.write(JSON.stringify({ ok: true, returnValue }));
} catch (error) {
  process.stdout.write(
    JSON.stringify({
      ok: false,
      errorName: error instanceof Error ? error.name : "RuntimeError",
      errorMessage: error instanceof Error ? error.message : String(error),
      ...(error instanceof Error && error.stack ? { stack: error.stack } : {})
    })
  );
}
`;
}
