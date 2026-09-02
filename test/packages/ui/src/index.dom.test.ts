// @vitest-environment jsdom

import { JSDOM } from "jsdom";
import { describe, expect, it, vi } from "vitest";
import type { SimulatorFunctionInfo } from "@execlens/ui";
import { renderSimulatorPanelHtml } from "@execlens/ui";

describe("renderSimulatorPanelHtml", () => {
  it("renders escaped function metadata and parameter fields", () => {
    const html = renderSimulatorPanelHtml({
      cspSource: "vscode-resource:",
      nonce: "test-nonce",
      functionInfo: {
        name: "<unsafe>",
        parameters: [
          {
            name: "value",
            typeLabel: "string",
            editor: "value",
            initialValue: "<script>alert(1)</script>",
            control: "text"
          }
        ]
      }
    });

    expect(html).toContain("&lt;unsafe&gt;");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("posts a simulation request with parsed form values", () => {
    const postMessage = vi.fn();
    const dom = createPanelDom(createFunctionInfo(), postMessage);
    const form = getRequiredElement<HTMLFormElement>(dom, "#run-form");

    getRequiredElement<HTMLInputElement>(dom, '[data-param-name="a"] [data-input-raw]').value = "2";
    getRequiredElement<HTMLInputElement>(dom, '[data-param-name="b"] [data-input-raw]').value = "3";
    form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({
      type: "execlens.runSimulation",
      payload: {
        requestId: expect.stringMatching(/^run-/),
        target: {
          kind: "function",
          filePath: "/workspace/math.ts",
          functionName: "add",
          parameterNames: ["a", "b"]
        },
        args: {
          a: 2,
          b: 3
        }
      }
    });
    expect(getRequiredElement<HTMLButtonElement>(dom, "#run-button").disabled).toBe(true);
    expect(getRequiredElement<HTMLButtonElement>(dom, "#stop-button").disabled).toBe(false);
  });

  it("renders simulation results sent by the host", () => {
    const postMessage = vi.fn();
    const dom = createPanelDom(createFunctionInfo(), postMessage);
    const form = getRequiredElement<HTMLFormElement>(dom, "#run-form");

    form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
    const request = postMessage.mock.calls[0]?.[0];
    const requestId = request?.payload?.requestId;

    dom.window.dispatchEvent(
      new dom.window.MessageEvent("message", {
        data: {
          type: "execlens.simulationResult",
          payload: {
            requestId,
            result: {
              ok: true,
              durationMs: 12,
              returnValue: 5,
              trace: [
                { type: "start", at: 1_000 },
                { type: "return", at: 1_012, value: 5 }
              ]
            }
          }
        }
      })
    );

    const outputText = getRequiredElement<HTMLElement>(dom, "#run-output").textContent ?? "";
    expect(outputText).toContain("Completed");
    expect(outputText).toContain("Return Value");
    expect(outputText).toContain("5");
    expect(getRequiredElement<HTMLButtonElement>(dom, "#run-button").disabled).toBe(false);
    expect(getRequiredElement<HTMLButtonElement>(dom, "#stop-button").disabled).toBe(true);
  });

  it("posts a cancellation request for the current simulation", () => {
    const postMessage = vi.fn();
    const dom = createPanelDom(createFunctionInfo(), postMessage);
    const form = getRequiredElement<HTMLFormElement>(dom, "#run-form");
    const stopButton = getRequiredElement<HTMLButtonElement>(dom, "#stop-button");

    form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
    const runMessage = postMessage.mock.calls[0]?.[0];

    stopButton.click();

    expect(postMessage).toHaveBeenLastCalledWith({
      type: "execlens.cancelSimulation",
      payload: {
        requestId: runMessage?.payload?.requestId
      }
    });
    expect(getRequiredElement<HTMLElement>(dom, "#run-output").textContent).toContain("Stopping");
  });

  it("shows an unsupported target state when VS Code messaging is unavailable", () => {
    const dom = createPanelDom(createFunctionInfo());
    const form = getRequiredElement<HTMLFormElement>(dom, "#run-form");

    getRequiredElement<HTMLInputElement>(dom, '[data-param-name="a"] [data-input-raw]').value = "2";
    getRequiredElement<HTMLInputElement>(dom, '[data-param-name="b"] [data-input-raw]').value = "3";
    form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));

    const outputText = getRequiredElement<HTMLElement>(dom, "#run-output").textContent ?? "";
    expect(outputText).toContain("Unsupported Target");
    expect(outputText).toContain("Parameters");
    expect(outputText).toContain('"a": 2');
    expect(getRequiredElement<HTMLButtonElement>(dom, "#run-button").disabled).toBe(false);
    expect(getRequiredElement<HTMLButtonElement>(dom, "#stop-button").disabled).toBe(true);
  });

  it("shows validation errors without posting invalid numeric parameters", () => {
    const postMessage = vi.fn();
    const dom = createPanelDom(createFunctionInfo(), postMessage);
    const form = getRequiredElement<HTMLFormElement>(dom, "#run-form");

    getRequiredElement<HTMLInputElement>(dom, '[data-param-name="a"] [data-input-raw]').value = "not-a-number";
    form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));

    expect(postMessage).not.toHaveBeenCalled();
    expect(getRequiredElement<HTMLElement>(dom, "#run-output").textContent).toContain("Invalid Input");
    expect(getRequiredElement<HTMLElement>(dom, '[data-param-name="a"] [data-field-error]').textContent).toBe(
      "Enter a valid number."
    );
  });

  it("initializes boolean, select, nullability and structured editors", () => {
    const dom = createPanelDom(
      {
        name: "configure",
        parameters: [
          {
            name: "enabled",
            typeLabel: "boolean",
            editor: "value",
            initialValue: "true",
            control: "boolean"
          },
          {
            name: "mode",
            typeLabel: '"auto" | "manual"',
            editor: "value",
            initialValue: "manual",
            control: "select",
            options: [
              { label: "auto", value: "auto" },
              { label: "manual", value: "manual" }
            ]
          },
          {
            name: "maybe",
            typeLabel: "string | null",
            editor: "value",
            initialValue: "",
            control: "text",
            allowNull: true
          },
          {
            name: "options",
            typeLabel: "{ label: string; retries: number }",
            editor: "json",
            initialValue: JSON.stringify({ label: "default", retries: 1 }, null, 2),
            structure: {
              kind: "object",
              typeLabel: "{ label: string; retries: number }",
              properties: {
                label: { kind: "primitive", typeLabel: "string", control: "text" },
                retries: { kind: "primitive", typeLabel: "number", control: "text" }
              }
            }
          },
          {
            name: "tags",
            typeLabel: "string[]",
            editor: "json",
            initialValue: JSON.stringify(["one"], null, 2),
            structure: {
              kind: "array",
              typeLabel: "string[]",
              item: { kind: "primitive", typeLabel: "string", control: "text" }
            }
          }
        ]
      },
      vi.fn()
    );

    expect(getRequiredElement<HTMLSelectElement>(dom, '[data-param-name="enabled"] select').value).toBe("true");
    expect(getRequiredElement<HTMLSelectElement>(dom, '[data-param-name="mode"] select').value).toBe("manual");
    expect(getRequiredElement<HTMLInputElement>(dom, '[data-param-name="maybe"] [data-null-toggle]').checked).toBe(
      false
    );
    expect(getRequiredElement<HTMLElement>(dom, '[data-param-name="options"] .json-object-block')).toBeTruthy();
    expect(getRequiredElement<HTMLElement>(dom, '[data-param-name="options"] [data-json-key="label"]')).toBeTruthy();
    expect(getRequiredElement<HTMLTextAreaElement>(dom, '[data-param-name="tags"] [data-array-item-input]').value).toBe(
      '"one"'
    );
  });
});

function createFunctionInfo(): SimulatorFunctionInfo {
  return {
    name: "add",
    target: {
      kind: "function",
      filePath: "/workspace/math.ts",
      functionName: "add",
      parameterNames: ["a", "b"]
    },
    parameters: [
      {
        name: "a",
        typeLabel: "number",
        editor: "value",
        initialValue: "0",
        control: "text"
      },
      {
        name: "b",
        typeLabel: "number",
        editor: "value",
        initialValue: "0",
        control: "text"
      }
    ]
  };
}

function createPanelDom(functionInfo: SimulatorFunctionInfo, postMessage?: (message: unknown) => void): JSDOM {
  return new JSDOM(
    renderSimulatorPanelHtml({
      cspSource: "vscode-resource:",
      nonce: "test-nonce",
      functionInfo
    }),
    {
      runScripts: "dangerously",
      url: "https://execlens.test/",
      beforeParse(window) {
        if (postMessage) {
          Object.defineProperty(window, "acquireVsCodeApi", {
            value: () => ({ postMessage })
          });
        }
      }
    }
  );
}

function getRequiredElement<T extends Element>(dom: JSDOM, selector: string): T {
  const element = dom.window.document.querySelector(selector);
  if (!element) {
    throw new Error(`Expected element "${selector}" to exist.`);
  }
  return element as T;
}
