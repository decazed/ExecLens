export type PlaygroundRuntimeScenario = {
  id: string;
  file: string;
  functionName: string;
  parameterNames: string[];
  args: unknown[];
  expected:
    | {
        ok: true;
        returnValue: unknown;
      }
    | {
        ok: false;
        errorName?: string;
        errorMessageIncludes: string;
        reason?: "error" | "timeout" | "cancelled";
      };
  timeoutMs?: number;
};

export const playgroundRuntimeScenarios: PlaygroundRuntimeScenario[] = [
  {
    id: "ts-basics/no-params-ping",
    file: "src/00-ts-basics.ts",
    functionName: "noParamsPing",
    parameterNames: [],
    args: [],
    expected: { ok: true, returnValue: "pong" }
  },
  {
    id: "ts-basics/add",
    file: "src/00-ts-basics.ts",
    functionName: "add",
    parameterNames: ["a", "b"],
    args: [2, 3],
    expected: { ok: true, returnValue: 5 }
  },
  {
    id: "ts-basics/greet",
    file: "src/00-ts-basics.ts",
    functionName: "greet",
    parameterNames: ["name"],
    args: ["Ada"],
    expected: { ok: true, returnValue: "Hello Ada" }
  },
  {
    id: "ts-basics/choose-label",
    file: "src/00-ts-basics.ts",
    functionName: "chooseLabel",
    parameterNames: ["enabled"],
    args: [false],
    expected: { ok: true, returnValue: "disabled" }
  },
  {
    id: "ts-basics/is-adult",
    file: "src/00-ts-basics.ts",
    functionName: "isAdult",
    parameterNames: ["age"],
    args: [18],
    expected: { ok: true, returnValue: true }
  },
  {
    id: "ts-structures/sum-numbers",
    file: "src/02-ts-input-structures.ts",
    functionName: "sumNumbers",
    parameterNames: ["values"],
    args: [[1, 2, 3]],
    expected: { ok: true, returnValue: 6 }
  },
  {
    id: "ts-structures/tuple-range",
    file: "src/02-ts-input-structures.ts",
    functionName: "tupleRange",
    parameterNames: ["range"],
    args: [[3, 9]],
    expected: { ok: true, returnValue: 6 }
  },
  {
    id: "ts-structures/format-money",
    file: "src/02-ts-input-structures.ts",
    functionName: "formatMoney",
    parameterNames: ["input"],
    args: [{ amount: 12, currency: "EUR" }],
    expected: { ok: true, returnValue: "12 EUR" }
  },
  {
    id: "ts-structures/summarize-checkout",
    file: "src/02-ts-input-structures.ts",
    functionName: "summarizeCheckout",
    parameterNames: ["input"],
    args: [
      {
        customer: {
          id: "cus_1",
          contact: { email: "ada@example.com" },
          tags: ["vip"]
        },
        lines: [
          {
            sku: "book",
            quantity: 2,
            unitPrice: { amount: 15, currency: "USD" }
          }
        ],
        couponCode: null
      }
    ],
    expected: { ok: true, returnValue: "ada@example.com:1:none" }
  },
  {
    id: "ts-control/shipping-tier",
    file: "src/04-ts-internal-control-flow.ts",
    functionName: "shippingTier",
    parameterNames: ["total"],
    args: [80],
    expected: { ok: true, returnValue: "priority" }
  },
  {
    id: "ts-control/first-positive",
    file: "src/04-ts-internal-control-flow.ts",
    functionName: "firstPositive",
    parameterNames: ["values"],
    args: [[-3, 0, 7]],
    expected: { ok: true, returnValue: 7 }
  },
  {
    id: "ts-async/delayed-greeting",
    file: "src/05-ts-internal-errors-and-async.ts",
    functionName: "delayedGreeting",
    parameterNames: ["name"],
    args: ["Ada"],
    expected: { ok: true, returnValue: "hello Ada" }
  },
  {
    id: "ts-async/promise-all-summary",
    file: "src/05-ts-internal-errors-and-async.ts",
    functionName: "promiseAllSummary",
    parameterNames: ["values"],
    args: [[1, 2, 3]],
    expected: { ok: true, returnValue: 12 }
  },
  {
    id: "ts-errors/require-positive",
    file: "src/05-ts-internal-errors-and-async.ts",
    functionName: "requirePositive",
    parameterNames: ["value"],
    args: [-1],
    expected: {
      ok: false,
      errorName: "InvalidOrderError",
      errorMessageIncludes: "value must be > 0"
    }
  },
  {
    id: "ts-errors/async-failure",
    file: "src/05-ts-internal-errors-and-async.ts",
    functionName: "asyncFailure",
    parameterNames: ["shouldFail"],
    args: [true],
    expected: {
      ok: false,
      errorName: "Error",
      errorMessageIncludes: "async failure"
    }
  },
  {
    id: "ts-timeout/delayed-greeting",
    file: "src/05-ts-internal-errors-and-async.ts",
    functionName: "delayedGreeting",
    parameterNames: ["name"],
    args: ["Ada"],
    timeoutMs: 5,
    expected: {
      ok: false,
      errorName: "TimeoutError",
      errorMessageIncludes: "Simulation timed out after 5ms.",
      reason: "timeout"
    }
  },
  {
    id: "ts-timeout/completes-under-timeout",
    file: "src/12-ts-runtime-and-timeouts.ts",
    functionName: "delayedGreeting",
    parameterNames: ["name"],
    args: ["Ada"],
    timeoutMs: 2_000,
    expected: { ok: true, returnValue: "hello Ada" }
  },
  {
    id: "ts-timeout/never-resolving-promise",
    file: "src/12-ts-runtime-and-timeouts.ts",
    functionName: "neverResolvingPromise",
    parameterNames: [],
    args: [],
    timeoutMs: 300,
    expected: {
      ok: false,
      errorName: "TimeoutError",
      errorMessageIncludes: "Simulation timed out after 300ms.",
      reason: "timeout"
    }
  },
  {
    id: "ts-timeout/infinite-loop",
    file: "src/12-ts-runtime-and-timeouts.ts",
    functionName: "infiniteLoop",
    parameterNames: [],
    args: [],
    timeoutMs: 300,
    expected: {
      ok: false,
      errorName: "TimeoutError",
      errorMessageIncludes: "Simulation timed out after 300ms.",
      reason: "timeout"
    }
  },
  {
    id: "ts-output/object",
    file: "src/10-ts-output-common.ts",
    functionName: "outputObject",
    parameterNames: ["id", "active"],
    args: ["item-1", true],
    expected: { ok: true, returnValue: { id: "item-1", active: true } }
  },
  {
    id: "ts-output/array",
    file: "src/10-ts-output-common.ts",
    functionName: "outputArray",
    parameterNames: ["prefix", "count"],
    args: ["row", 3],
    expected: { ok: true, returnValue: ["row-1", "row-2", "row-3"] }
  },
  {
    id: "js-runtime/add",
    file: "src/14-js-specific-runtime.js",
    functionName: "jsAdd",
    parameterNames: ["a", "b"],
    args: [4, 5],
    expected: { ok: true, returnValue: 9 }
  },
  {
    id: "js-runtime/mutate-and-return",
    file: "src/14-js-specific-runtime.js",
    functionName: "jsMutateAndReturn",
    parameterNames: ["input"],
    args: [{ id: "item-1" }],
    expected: { ok: true, returnValue: { id: "item-1", touched: true } }
  },
  {
    id: "cjs-runtime/add",
    file: "src/15-js-commonjs-and-interop.cjs",
    functionName: "cjsAdd",
    parameterNames: ["a", "b"],
    args: [6, 7],
    expected: { ok: true, returnValue: 13 }
  }
];
