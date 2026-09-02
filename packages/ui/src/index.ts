import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SimulatorFunctionInfo, SimulatorParameterField } from "@execlens/protocol";

export type { SimulatorFunctionInfo } from "@execlens/protocol";

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
    .replaceAll("{{functionInfoJson}}", escapeHtmlForHtmlText(JSON.stringify(functionInfo)))
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
      const inputHtml = buildParameterInputHtml(parameter, escapedValue);
      const nullabilityControlsHtml = buildNullabilityControlsHtml(parameter);

      return [
        `<div class="field" data-param-name="${escapedName}" data-editor="${parameter.editor}" data-type-label="${escapedType}"${parameter.structure ? ` data-structure-json="${escapeHtml(JSON.stringify(parameter.structure))}"` : ""}>`,
        '  <div class="field-header">',
        `    <span>${escapedName}</span>`,
        `    <span class="type-label">${escapedType}</span>`,
        "  </div>",
        `  ${inputHtml}`,
        `  ${nullabilityControlsHtml}`,
        '  <p class="field-error" data-field-error hidden></p>',
        "</div>"
      ].join("\n");
    })
    .join("\n");
}

function buildParameterInputHtml(parameter: SimulatorParameterField, escapedValue: string): string {
  if (parameter.editor === "json") {
    if (parameter.structure?.kind === "object") {
      return `<div class="object-editor" data-object-editor data-object-initial-json="${escapedValue}"></div>`;
    }

    if (parameter.structure?.kind === "array" || parameter.structure?.kind === "tuple") {
      const isTuple = parameter.structure.kind === "tuple";
      return [
        `<div class="array-editor" data-array-editor data-array-mode="${isTuple ? "tuple" : "array"}" data-array-initial-json="${escapedValue}">`,
        '  <div class="array-items" data-array-items></div>',
        `${isTuple ? "" : '  <button type="button" class="array-add-button" data-array-add>Add item</button>'}`,
        "</div>"
      ].join("\n");
    }

    return `<textarea class="json-input" data-input-json rows="8">${escapedValue}</textarea>`;
  }

  if (parameter.control === "boolean") {
    const currentValue = parameter.initialValue === "true" ? "true" : "false";
    return [
      '<select class="field-select" data-input-select>',
      `  <option value="true"${currentValue === "true" ? " selected" : ""}>true</option>`,
      `  <option value="false"${currentValue === "false" ? " selected" : ""}>false</option>`,
      "</select>"
    ].join("\n");
  }

  if (parameter.control === "select" && parameter.options && parameter.options.length > 0) {
    const optionsHtml = parameter.options
      .map((option) => {
        const escapedOptionLabel = escapeHtml(option.label);
        const escapedOptionValue = escapeHtml(option.value);
        const isSelected = option.value === parameter.initialValue;
        return `  <option value="${escapedOptionValue}"${isSelected ? " selected" : ""}>${escapedOptionLabel}</option>`;
      })
      .join("\n");

    return ['<select class="field-select" data-input-select>', optionsHtml, "</select>"].join("\n");
  }

  return `<input class="field-input" type="text" data-input-raw value="${escapedValue}" />`;
}

function buildNullabilityControlsHtml(parameter: SimulatorParameterField): string {
  if (!parameter.allowNull && !parameter.allowUndefined) {
    return "";
  }

  const controls: string[] = ['<div class="nullability-row">'];
  if (parameter.allowNull) {
    controls.push(
      '  <label class="toggle-option"><input type="checkbox" data-null-toggle /> <span>Use null</span></label>'
    );
  }
  if (parameter.allowUndefined) {
    controls.push(
      '  <label class="toggle-option"><input type="checkbox" data-undefined-toggle /> <span>Use undefined</span></label>'
    );
  }
  controls.push("</div>");
  return controls.join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeHtmlForHtmlText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

type PanelAssets = {
  template: string;
  styles: string;
  script: string;
};

const PANEL_SCRIPT_FILES = [
  "panel.output.js",
  "panel.fields.js",
  "panel.structured-editor.js",
  "panel.js"
] as const;

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
      const script = readPanelScript(baseDir);
      cachedPanelAssets = { template, styles, script };
      return cachedPanelAssets;
    } catch {
      continue;
    }
  }

  throw new Error("Unable to load UI panel assets (panel.html/panel.css/panel.js).");
}

function readPanelScript(baseDir: string): string {
  const scriptParts = PANEL_SCRIPT_FILES.map((fileName) => readFileSync(path.join(baseDir, fileName), "utf-8"));
  return scriptParts.join("\n\n");
}

function getPanelAssetBaseDirs(): string[] {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);

  return [
    path.resolve(currentDir, "panel"),
    path.resolve(currentDir, "../src/panel")
  ];
}
