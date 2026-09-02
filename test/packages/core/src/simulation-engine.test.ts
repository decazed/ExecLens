import { describe, expect, it, vi } from "vitest";
import type { RuntimeAdapter, RuntimeExecutionRequest, SimulationRequest } from "@execlens/protocol";
import { createRuntimeExecutionRequest, SimulationEngine, simulateFunction } from "../../../../packages/core/src/index.js";

const request: SimulationRequest = {
  target: {
    kind: "function",
    filePath: "sample.ts",
    functionName: "add",
    parameterNames: ["a", "b"]
  },
  args: {
    a: 2,
    b: 3
  }
};

describe("createRuntimeExecutionRequest", () => {
  it("maps named simulation args to runtime positional args", () => {
    expect(createRuntimeExecutionRequest(request, 500)).toEqual({
      target: request.target,
      positionalArgs: [2, 3],
      timeoutMs: 500
    });
  });

  it("preserves missing args as undefined to keep parameter order stable", () => {
    const runtimeRequest = createRuntimeExecutionRequest({
      ...request,
      args: { a: 2 }
    });

    expect(runtimeRequest.positionalArgs).toEqual([2, undefined]);
  });
});

describe("SimulationEngine", () => {
  it("returns a normalized success result with duration and trace", async () => {
    const runtimeAdapter: RuntimeAdapter = {
      execute: vi.fn(async () => ({ ok: true, returnValue: 5 }))
    };
    const now = createClock([100, 125]);

    const result = await new SimulationEngine(runtimeAdapter, { now }).simulate(request);

    expect(runtimeAdapter.execute).toHaveBeenCalledWith(
      {
        target: request.target,
        positionalArgs: [2, 3]
      },
      undefined
    );
    expect(result).toEqual({
      ok: true,
      durationMs: 25,
      returnValue: 5,
      trace: [
        { type: "start", at: 100 },
        { type: "return", at: 125, value: 5 }
      ]
    });
  });

  it("returns a normalized failure result from runtime failures", async () => {
    const runtimeAdapter: RuntimeAdapter = {
      execute: vi.fn(async () => ({
        ok: false,
        errorName: "RuntimeError",
        errorMessage: "boom",
        stack: "stack"
      }))
    };
    const now = createClock([200, 260]);

    const result = await new SimulationEngine(runtimeAdapter, { now }).simulate(request);

    expect(result).toEqual({
      ok: false,
      durationMs: 60,
      errorName: "RuntimeError",
      errorMessage: "boom",
      stack: "stack",
      trace: [
        { type: "start", at: 200 },
        { type: "throw", at: 260, errorName: "RuntimeError", errorMessage: "boom" }
      ]
    });
  });

  it("converts adapter throws to simulation failures", async () => {
    const runtimeAdapter: RuntimeAdapter = {
      execute: vi.fn(async () => {
        throw new TypeError("adapter exploded");
      })
    };
    const now = createClock([300, 330]);

    const result = await new SimulationEngine(runtimeAdapter, { now }).simulate(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.durationMs).toBe(30);
      expect(result.errorName).toBe("TypeError");
      expect(result.errorMessage).toBe("adapter exploded");
      expect(result.trace).toEqual([
        { type: "start", at: 300 },
        { type: "throw", at: 330, errorName: "TypeError", errorMessage: "adapter exploded" }
      ]);
    }
  });

  it("passes timeout options and abort signals to the runtime adapter", async () => {
    const abortSignal = new AbortController().signal;
    let receivedRequest: RuntimeExecutionRequest | null = null;
    const runtimeAdapter: RuntimeAdapter = {
      execute: vi.fn(async (runtimeRequest) => {
        receivedRequest = runtimeRequest;
        return { ok: true, returnValue: "ok" };
      })
    };

    await new SimulationEngine(runtimeAdapter, { timeoutMs: 123 }).simulate(request, abortSignal);

    expect(receivedRequest).toEqual({
      target: request.target,
      positionalArgs: [2, 3],
      timeoutMs: 123
    });
    expect(runtimeAdapter.execute).toHaveBeenCalledWith(expect.any(Object), abortSignal);
  });
});

describe("simulateFunction", () => {
  it("keeps the backwards-compatible function API", async () => {
    const runtimeAdapter: RuntimeAdapter = {
      execute: vi.fn(async () => ({ ok: true, returnValue: 5 }))
    };

    await expect(simulateFunction(runtimeAdapter, request)).resolves.toMatchObject({
      ok: true,
      returnValue: 5
    });
  });
});

function createClock(values: number[]): () => number {
  return () => {
    const value = values.shift();
    if (typeof value !== "number") {
      throw new Error("Test clock exhausted");
    }
    return value;
  };
}
