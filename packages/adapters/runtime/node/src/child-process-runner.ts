import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import type { RuntimeExecutionResult, SimulationAbortSignal } from "@execlens/protocol";

export type ChildProcessExecutionInput = {
  moduleSpecifier: string;
  functionName: string;
  args: unknown[];
  timeoutMs: number;
};

export async function executeInChildProcess(
  input: ChildProcessExecutionInput,
  signal?: SimulationAbortSignal
): Promise<RuntimeExecutionResult> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "execlens-runner-"));
  const runnerPath = path.join(tempDir, "runner.mjs");
  await writeFile(runnerPath, createRunnerSource(), "utf-8");

  return new Promise<RuntimeExecutionResult>((resolve, reject) => {
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
        resolve(JSON.parse(stdout) as RuntimeExecutionResult);
      } catch {
        reject(new Error(`Unable to parse runtime output: ${stdout}`));
      }
    });

    child.stdin.write(
      JSON.stringify({
        moduleSpecifier: input.moduleSpecifier,
        functionName: input.functionName,
        args: input.args
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
