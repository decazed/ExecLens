import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import type { RuntimeExecutionResult, SimulationAbortSignal } from "@execlens/protocol";

export type ChildProcessExecutionInput = {
  moduleSpecifier: string;
  functionName: string;
  args: unknown[];
  timeoutMs: number;
};

/** Grace period between SIGTERM and SIGKILL for a child that will not stop. */
const KILL_GRACE_MS = 250;

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
      terminateChild(child);
      reject(namedError("TimeoutError", `Simulation timed out after ${input.timeoutMs}ms.`));
    }, input.timeoutMs);

    const abortHandler = (): void => {
      clearTimeout(timer);
      terminateChild(child);
      reject(namedError("AbortError", "Simulation stopped by user."));
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

/**
 * Ask the child to stop with SIGTERM, then force it with SIGKILL if it is still
 * alive after the grace period. A synchronous infinite loop cannot service a
 * JS-level SIGTERM handler, so the SIGKILL escalation is what actually frees the
 * host. On Windows both signals map to a forced terminate, so the first call is
 * already enough and the timer is a no-op.
 */
function terminateChild(child: ChildProcess): void {
  if (hasExited(child)) {
    return;
  }

  child.kill("SIGTERM");

  const killTimer = setTimeout(() => {
    if (!hasExited(child)) {
      child.kill("SIGKILL");
    }
  }, KILL_GRACE_MS);
  killTimer.unref();

  child.once("exit", () => clearTimeout(killTimer));
}

function hasExited(child: ChildProcess): boolean {
  return child.exitCode !== null || child.signalCode !== null;
}

function namedError(name: string, message: string): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

function createRunnerSource(): string {
  return `
const chunks = [];
for await (const chunk of process.stdin) {
  chunks.push(chunk);
}

const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));

// Keep the process alive while awaiting the target. Without this a target that
// returns a promise that never settles would let the event loop drain and the
// child would exit silently instead of hitting the parent's timeout.
const keepAlive = setInterval(() => {}, 2147483647);

try {
  const moduleNamespace = await import(input.moduleSpecifier);
  const target = moduleNamespace[input.functionName];
  if (typeof target !== "function") {
    throw new Error(\`Export "\${input.functionName}" was not found or is not a function.\`);
  }

  const returnValue = await target(...input.args);
  clearInterval(keepAlive);
  process.stdout.write(JSON.stringify({ ok: true, returnValue }));
} catch (error) {
  clearInterval(keepAlive);
  process.stdout.write(
    JSON.stringify({
      ok: false,
      reason: "error",
      errorName: error instanceof Error ? error.name : "RuntimeError",
      errorMessage: error instanceof Error ? error.message : String(error),
      ...(error instanceof Error && error.stack ? { stack: error.stack } : {})
    })
  );
}
`;
}
