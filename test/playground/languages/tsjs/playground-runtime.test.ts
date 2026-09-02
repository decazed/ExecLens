import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { NodeRuntimeAdapter } from "@execlens/adapter-node-runtime";
import { playgroundRuntimeScenarios } from "./scenarios.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const playgroundWorkspaceRoot = path.join(repoRoot, "playground", "languages", "tsjs");

describe("playground runtime scenarios", () => {
  const runtimeAdapter = new NodeRuntimeAdapter(2_000);

  for (const scenario of playgroundRuntimeScenarios) {
    it(`runs ${scenario.id}`, async () => {
      const result = await runtimeAdapter.execute({
        target: {
          kind: "function",
          filePath: path.join(playgroundWorkspaceRoot, scenario.file),
          functionName: scenario.functionName,
          parameterNames: scenario.parameterNames
        },
        positionalArgs: scenario.args,
        ...(typeof scenario.timeoutMs === "number" ? { timeoutMs: scenario.timeoutMs } : {})
      });

      if (scenario.expected.ok) {
        expect(result).toEqual({
          ok: true,
          returnValue: scenario.expected.returnValue
        });
        return;
      }

      expect(result).toMatchObject({
        ok: false,
        ...(scenario.expected.errorName ? { errorName: scenario.expected.errorName } : {}),
        ...(scenario.expected.reason ? { reason: scenario.expected.reason } : {})
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errorMessage).toContain(scenario.expected.errorMessageIncludes);
      }
    });
  }
});
