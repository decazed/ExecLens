import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { NodeRuntimeAdapter } from "@execlens/adapter-node-runtime";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("NodeRuntimeAdapter", () => {
  it("advertises its id and the file types it can run", () => {
    const adapter = new NodeRuntimeAdapter();

    expect(adapter.id).toBe("node");
    for (const ext of [".ts", ".mts", ".cts", ".tsx", ".js", ".mjs", ".cjs"]) {
      expect(adapter.canRun({ kind: "function", filePath: `m${ext}`, functionName: "f", parameterNames: [] })).toBe(true);
    }
    expect(adapter.canRun({ kind: "function", filePath: "m.py", functionName: "f", parameterNames: [] })).toBe(false);
  });

  it("executes an exported TypeScript function in a child process", async () => {
    const filePath = await writeTempFile(
      "math.ts",
      "export function add(a: number, b: number): number {\n  return a + b;\n}\n"
    );

    const result = await new NodeRuntimeAdapter(1_000).execute({
      target: {
        kind: "function",
        filePath,
        functionName: "add",
        parameterNames: ["a", "b"]
      },
      positionalArgs: [2, 3]
    });

    expect(result).toEqual({ ok: true, returnValue: 5 });
  });

  it("normalizes thrown runtime errors", async () => {
    const filePath = await writeTempFile(
      "failure.mjs",
      "export function fail() {\n  throw new RangeError('outside range');\n}\n"
    );

    const result = await new NodeRuntimeAdapter(1_000).execute({
      target: {
        kind: "function",
        filePath,
        functionName: "fail",
        parameterNames: []
      },
      positionalArgs: []
    });

    expect(result).toMatchObject({
      ok: false,
      errorName: "RangeError",
      errorMessage: "outside range"
    });
  });

  it("reports missing exported functions as runtime failures", async () => {
    const filePath = await writeTempFile("empty.mjs", "export const value = 1;\n");

    const result = await new NodeRuntimeAdapter(1_000).execute({
      target: {
        kind: "function",
        filePath,
        functionName: "missing",
        parameterNames: []
      },
      positionalArgs: []
    });

    expect(result).toMatchObject({
      ok: false,
      errorName: "Error",
      errorMessage: 'Export "missing" was not found or is not a function.'
    });
  });

  it("enforces execution timeouts", async () => {
    const filePath = await writeTempFile(
      "slow.mjs",
      "export async function slow() {\n  await new Promise((resolve) => setTimeout(resolve, 500));\n  return 'late';\n}\n"
    );

    const result = await new NodeRuntimeAdapter(25).execute({
      target: {
        kind: "function",
        filePath,
        functionName: "slow",
        parameterNames: []
      },
      positionalArgs: []
    });

    expect(result).toMatchObject({
      ok: false,
      errorName: "TimeoutError",
      reason: "timeout"
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorMessage).toContain("Simulation timed out after 25ms.");
    }
  });

  it("terminates a synchronous infinite loop on timeout", async () => {
    const filePath = await writeTempFile(
      "loop.mjs",
      "export function spin() {\n  while (true) {}\n}\n"
    );

    const startedAt = Date.now();
    const result = await new NodeRuntimeAdapter(100).execute({
      target: {
        kind: "function",
        filePath,
        functionName: "spin",
        parameterNames: []
      },
      positionalArgs: []
    });

    expect(result).toMatchObject({ ok: false, errorName: "TimeoutError", reason: "timeout" });
    // SIGKILL escalation must free the runner well before the test timeout.
    expect(Date.now() - startedAt).toBeLessThan(5_000);
  });

  it("supports aborting a running simulation", async () => {
    const filePath = await writeTempFile(
      "abortable.mjs",
      "export async function slow() {\n  await new Promise((resolve) => setTimeout(resolve, 500));\n  return 'late';\n}\n"
    );
    const abortController = new AbortController();
    const execution = new NodeRuntimeAdapter(1_000).execute(
      {
        target: {
          kind: "function",
          filePath,
          functionName: "slow",
          parameterNames: []
        },
        positionalArgs: []
      },
      abortController.signal
    );

    setTimeout(() => abortController.abort(), 25);

    await expect(execution).resolves.toMatchObject({
      ok: false,
      errorName: "AbortError",
      errorMessage: "Simulation stopped by user.",
      reason: "cancelled"
    });
  });

  it("reports unsupported source files as runtime failures", async () => {
    const filePath = await writeTempFile("notes.txt", "not executable");

    await expect(
      new NodeRuntimeAdapter(1_000).execute({
        target: {
          kind: "function",
          filePath,
          functionName: "anything",
          parameterNames: []
        },
        positionalArgs: []
      })
    ).resolves.toMatchObject({
      ok: false,
      errorName: "Error",
      errorMessage: "Unsupported file type: .txt"
    });
  });
});

async function writeTempFile(fileName: string, source: string): Promise<string> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "execlens-node-runtime-test-"));
  tempDirs.push(tempDir);
  const filePath = path.join(tempDir, fileName);
  await writeFile(filePath, source, "utf-8");
  return filePath;
}
