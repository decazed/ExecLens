import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type SimulatorParameterField = {
  name: string;
  typeLabel: string;
  editor: "value" | "json";
  initialValue: string;
};

export type SimulatorFunctionInfo = {
  name: string;
  parameters: SimulatorParameterField[];
};

type RenderSimulatorPanelHtmlInput = {
  cspSource: string;
  nonce: string;
  functionInfo: SimulatorFunctionInfo;
};

export function renderSimulatorPanelHtml(input: RenderSimulatorPanelHtmlInput): string {
  const { cspSource, nonce, functionInfo } = input;
  const assets = getPanelAssets();

  return assets.template
    .replaceAll("{{cspSource}}", cspSource)
    .replaceAll("{{nonce}}", nonce)
    .replaceAll("{{styles}}", assets.styles.trim())
    .replaceAll("{{script}}", assets.script.trim())
    .replaceAll("{{functionName}}", escapeHtml(functionInfo.name))
    .replaceAll("{{parameterFieldsHtml}}", buildParameterFieldsHtml(functionInfo.parameters));
}

function buildParameterFieldsHtml(parameters: SimulatorParameterField[]): string {
  if (parameters.length === 0) {
    return '<p class="empty">No parameters detected for this function.</p>';
  }

  return parameters
    .map((parameter) => {
      const escapedName = escapeHtml(parameter.name);
      const escapedType = escapeHtml(parameter.typeLabel);
      const escapedValue = escapeHtml(parameter.initialValue);
      const inputHtml =
        parameter.editor === "json"
          ? `<textarea class="json-input" data-input-json rows="8">${escapedValue}</textarea>`
          : `<input class="field-input" type="text" data-input-raw value="${escapedValue}" />`;

      return [
        `<div class="field" data-param-name="${escapedName}" data-editor="${parameter.editor}">`,
        '  <div class="field-header">',
        `    <span>${escapedName}</span>`,
        `    <span class="type-label">${escapedType}</span>`,
        "  </div>",
        `  ${inputHtml}`,
        "</div>"
      ].join("\n");
    })
    .join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type PanelAssets = {
  template: string;
  styles: string;
  script: string;
};

let cachedPanelAssets: PanelAssets | null = null;

function getPanelAssets(): PanelAssets {
  if (cachedPanelAssets) {
    return cachedPanelAssets;
  }

  const candidates = getPanelAssetBaseDirs();
  for (const baseDir of candidates) {
    try {
      const template = readFileSync(path.join(baseDir, "panel.html"), "utf-8");
      const styles = readFileSync(path.join(baseDir, "panel.css"), "utf-8");
      const script = readFileSync(path.join(baseDir, "panel.js"), "utf-8");
      cachedPanelAssets = { template, styles, script };
      return cachedPanelAssets;
    } catch {
      continue;
    }
  }

  throw new Error("Unable to load UI panel assets (panel.html/panel.css/panel.js).");
}

function getPanelAssetBaseDirs(): string[] {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);

  return [
    path.resolve(currentDir, "panel"),
    path.resolve(currentDir, "../src/panel")
  ];
}
