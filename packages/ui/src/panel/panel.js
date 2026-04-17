const form = document.getElementById("run-form");
const output = document.getElementById("run-output");
const runButton = document.getElementById("run-button");
const stopButton = document.getElementById("stop-button");
const vscode = typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : null;
const functionInfo = readFunctionInfo();
let currentRequestId = null;
let isRunning = false;

renderOutputState({
  tone: "neutral",
  title: "Ready",
  message: "Click Run to execute the function with the current parameters."
});

function readFunctionInfo() {
  const node = document.getElementById("execlens-function-info");
  if (!node) {
    return null;
  }

  try {
    return JSON.parse(node.textContent ?? "null");
  } catch (error) {
    renderOutputState({
      tone: "error",
      title: "Panel Init Error",
      message: error instanceof Error ? error.message : String(error),
      raw: {
        status: "panel-init-error",
        message: error instanceof Error ? error.message : String(error)
      }
    });
    return null;
  }
}

function parseLooseValue(rawValue) {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) {
    return "";
  }

  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  if (trimmed === "null") {
    return null;
  }
  if (trimmed === "undefined") {
    return undefined;
  }
  if (/^-?\d+n$/.test(trimmed)) {
    return trimmed;
  }
  if (!Number.isNaN(Number(trimmed)) && trimmed !== "") {
    return Number(trimmed);
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.startsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return rawValue;
    }
  }

  return rawValue;
}

function setRunningState(nextRunning) {
  isRunning = nextRunning;
  if (runButton) {
    runButton.disabled = nextRunning;
  }
  if (stopButton) {
    stopButton.disabled = !nextRunning;
  }
}

function renderOutputState(input) {
  output.replaceChildren();

  const card = document.createElement("div");
  card.className = "output-card";
  card.dataset.tone = input.tone ?? "neutral";

  const header = document.createElement("div");
  header.className = "output-header";

  const status = document.createElement("div");
  status.className = "output-status";
  const dot = document.createElement("span");
  dot.className = "output-dot";
  const title = document.createElement("span");
  title.textContent = input.title;
  status.append(dot, title);

  header.append(status);

  if (input.meta && input.meta.length > 0) {
    const meta = document.createElement("div");
    meta.className = "output-meta";
    for (const item of input.meta) {
      const chip = document.createElement("span");
      chip.className = "output-chip";
      chip.textContent = item;
      meta.append(chip);
    }
    header.append(meta);
  }

  card.append(header);

  if (input.message) {
    const section = document.createElement("div");
    section.className = "output-section";
    const text = document.createElement("p");
    text.className = "output-message";
    text.textContent = input.message;
    section.append(text);
    card.append(section);
  }

  if (typeof input.primaryValue !== "undefined") {
    card.append(buildOutputSection(input.primaryLabel ?? "Result", input.primaryValue, input.primaryMode));
  }

  if (typeof input.secondaryValue !== "undefined") {
    card.append(buildOutputSection(input.secondaryLabel ?? "Details", input.secondaryValue, input.secondaryMode));
  }

  if (typeof input.raw !== "undefined") {
    const details = document.createElement("details");
    details.className = "output-details";
    const summary = document.createElement("summary");
    summary.textContent = "Raw JSON";
    const raw = document.createElement("pre");
    raw.className = "output-raw";
    raw.textContent = JSON.stringify(formatRawJsonForDisplay(input.raw), null, 2);
    details.append(summary, raw);
    card.append(details);
  }

  output.append(card);
}

function buildOutputSection(label, value, mode = "code") {
  const section = document.createElement("div");
  section.className = "output-section";
  const title = document.createElement("p");
  title.className = "output-section-title";
  title.textContent = label;

  if (mode === "trace") {
    section.append(title, buildTraceView(Array.isArray(value) ? value : []));
    return section;
  }

  const code = document.createElement("pre");
  code.className = "output-code";
  code.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  section.append(title, code);
  return section;
}

function buildTraceView(trace) {
  const container = document.createElement("div");
  container.className = "output-trace";

  if (trace.length === 0) {
    const empty = document.createElement("div");
    empty.className = "output-empty";
    empty.textContent = "No trace events.";
    container.append(empty);
    return container;
  }

  for (const event of trace) {
    const item = document.createElement("div");
    item.className = "output-trace-item";

    const top = document.createElement("div");
    top.className = "output-trace-top";

    const kind = document.createElement("span");
    kind.className = "output-trace-kind";
    kind.textContent = event.type ?? "event";

    const time = document.createElement("span");
    time.className = "output-trace-time";
    time.textContent = typeof event.at === "number" ? formatTimestamp(event.at) : "no timestamp";

    const message = document.createElement("p");
    message.className = "output-trace-message";
    message.textContent = describeTraceEvent(event);

    top.append(kind, time);
    item.append(top, message);
    container.append(item);
  }

  return container;
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return String(timestamp);
  }
  return date.toISOString();
}

function describeTraceEvent(event) {
  if (event.type === "start") {
    return "Simulation started.";
  }
  if (event.type === "return") {
    return `Returned ${JSON.stringify(event.value)}.`;
  }
  if (event.type === "throw") {
    return `${event.errorName}: ${event.errorMessage}`;
  }
  return JSON.stringify(event);
}

function toDisplayResult(result) {
  if (result?.ok) {
    return {
      status: "success",
      durationMs: result.durationMs,
      returnValue: result.returnValue,
      trace: result.trace
    };
  }

  return {
    status: "error",
    durationMs: result?.durationMs,
    errorName: result?.errorName,
    errorMessage: result?.errorMessage,
    trace: result?.trace,
    ...(result?.stack ? { stack: result.stack } : {})
  };
}

function formatRawJsonForDisplay(value) {
  if (Array.isArray(value)) {
    return value.map((item) => formatRawJsonForDisplay(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const result = {};
  for (const [key, innerValue] of Object.entries(value)) {
    if (key === "at" && typeof innerValue === "number") {
      result[key] = formatTimestamp(innerValue);
      continue;
    }

    result[key] = formatRawJsonForDisplay(innerValue);
  }

  return result;
}

function readFieldValidation(field) {
  const nullToggle = field.querySelector("[data-null-toggle]");
  if (nullToggle?.checked) {
    return { ok: true, value: null };
  }

  const undefinedToggle = field.querySelector("[data-undefined-toggle]");
  if (undefinedToggle?.checked) {
    return { ok: true, value: undefined };
  }

  const editor = field.getAttribute("data-editor") ?? "value";
  const typeLabel = field.getAttribute("data-type-label") ?? "unknown";

  if (editor === "json") {
    const objectEditor = field.querySelector("[data-object-editor]");
    if (objectEditor) {
      return readObjectEditorValidation(field);
    }

    const arrayEditor = field.querySelector("[data-array-editor]");
    if (arrayEditor) {
      return readArrayEditorValidation(field);
    }

    const rawJson = field.querySelector("[data-input-json]")?.value?.trim() ?? "";
    if (!rawJson) {
      return { ok: false, message: "A JSON value is required." };
    }

    try {
      return { ok: true, value: JSON.parse(rawJson) };
    } catch {
      return { ok: false, message: "Enter valid JSON." };
    }
  }

  const rawValue = field.querySelector("[data-input-raw]")?.value ?? "";
  const selectValue = field.querySelector("[data-input-select]")?.value;
  if (typeof selectValue === "string") {
    return validateRawValue(selectValue, typeLabel);
  }
  return validateRawValue(rawValue, typeLabel);
}

function readObjectEditorValidation(field) {
  const objectEditor = field.querySelector("[data-object-editor]");
  if (!objectEditor) {
    return { ok: false, message: "Structured object editor not found." };
  }

  const structure = readFieldStructure(field);
  return readStructuredNodeValue(objectEditor.firstElementChild, structure);
}

function readArrayEditorValidation(field) {
  const itemInputs = Array.from(field.querySelectorAll("[data-array-item-input]"));
  const values = [];

  for (const input of itemInputs) {
    const rawJson = input.value.trim();
    if (!rawJson) {
      return { ok: false, message: "Array items cannot be empty." };
    }

    try {
      values.push(JSON.parse(rawJson));
    } catch {
      return { ok: false, message: "Each array item must contain valid JSON." };
    }
  }

  return { ok: true, value: values };
}

function validateRawValue(rawValue, typeLabel) {
  const trimmed = rawValue.trim();
  const normalizedType = typeLabel.trim();

  if (normalizedType === "number") {
    if (trimmed.length === 0) {
      return { ok: false, message: "A number is required." };
    }
    if (Number.isNaN(Number(trimmed))) {
      return { ok: false, message: "Enter a valid number." };
    }
    return { ok: true, value: Number(trimmed) };
  }

  if (normalizedType === "bigint") {
    if (!/^-?\d+n$/.test(trimmed)) {
      return { ok: false, message: 'Enter a bigint like "12n".' };
    }
    return { ok: true, value: trimmed };
  }

  return { ok: true, value: parseLooseValue(rawValue) };
}

function showFieldError(field, message) {
  const errorNode = field.querySelector("[data-field-error]");
  field.classList.add("has-error");
  if (errorNode) {
    errorNode.hidden = false;
    errorNode.textContent = message;
  }
}

function clearFieldError(field) {
  const errorNode = field.querySelector("[data-field-error]");
  field.classList.remove("has-error");
  if (errorNode) {
    errorNode.hidden = true;
    errorNode.textContent = "";
  }
}

function validateAllFields(fields) {
  const params = {};
  const errors = [];

  for (const field of fields) {
    clearFieldError(field);

    const key = field.getAttribute("data-param-name");
    if (!key) {
      continue;
    }

    const validation = readFieldValidation(field);
    if (!validation.ok) {
      errors.push({ parameter: key, message: validation.message });
      showFieldError(field, validation.message);
      continue;
    }

    params[key] = validation.value;
  }

  return { params, errors };
}

function attachLiveValidation() {
  const fields = Array.from(form?.querySelectorAll("[data-param-name]") ?? []);
  for (const field of fields) {
    setupObjectEditor(field);
    setupArrayEditor(field);

    const input = field.querySelector("[data-input-raw], [data-input-json], [data-input-select]");
    input?.addEventListener("input", () => {
      const validation = readFieldValidation(field);
      if (validation.ok) {
        clearFieldError(field);
      }
    });

    const nullToggle = field.querySelector("[data-null-toggle]");
    const undefinedToggle = field.querySelector("[data-undefined-toggle]");
    const valueInput = field.querySelector("[data-input-raw], [data-input-json], [data-input-select]");

    nullToggle?.addEventListener("change", () => {
      if (nullToggle.checked && undefinedToggle) {
        undefinedToggle.checked = false;
      }
      if (valueInput) {
        valueInput.disabled = nullToggle.checked;
      }
      clearFieldError(field);
    });

    undefinedToggle?.addEventListener("change", () => {
      if (undefinedToggle.checked && nullToggle) {
        nullToggle.checked = false;
      }
      if (valueInput) {
        valueInput.disabled = undefinedToggle.checked;
      }
      clearFieldError(field);
    });
  }
}

function setupObjectEditor(field) {
  const objectEditor = field.querySelector("[data-object-editor]");
  if (!objectEditor || objectEditor.dataset.initialized === "true") {
    return;
  }

  objectEditor.dataset.initialized = "true";
  const initialJson = objectEditor.getAttribute("data-object-initial-json") ?? "{}";
  const structure = readFieldStructure(field);

  try {
    const parsed = JSON.parse(initialJson);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return;
    }

    objectEditor.replaceChildren(buildStructuredNode(parsed, structure, { label: "Object", mode: "object", depth: 0 }));
  } catch {
    return;
  }
}

function readFieldStructure(field) {
  const rawStructure = field.getAttribute("data-structure-json");
  if (!rawStructure) {
    return null;
  }

  try {
    return JSON.parse(rawStructure);
  } catch {
    return null;
  }
}

function setupArrayEditor(field) {
  const arrayEditor = field.querySelector("[data-array-editor]");
  if (!arrayEditor || arrayEditor.dataset.initialized === "true") {
    return;
  }

  arrayEditor.dataset.initialized = "true";
  const itemsContainer = arrayEditor.querySelector("[data-array-items]");
  const addButton = arrayEditor.querySelector("[data-array-add]");
  const arrayMode = arrayEditor.getAttribute("data-array-mode") ?? "array";
  const initialJson = arrayEditor.getAttribute("data-array-initial-json") ?? "[]";
  let initialItems = [];

  try {
    const parsed = JSON.parse(initialJson);
    if (Array.isArray(parsed)) {
      initialItems = parsed;
    }
  } catch {
    initialItems = [];
  }

  const itemTemplate = initialItems.length > 0 ? cloneJsonValue(initialItems[0]) : "";
  for (const item of initialItems) {
    appendArrayItem(itemsContainer, item, arrayMode);
  }

  addButton?.addEventListener("click", () => {
    appendArrayItem(itemsContainer, cloneJsonValue(itemTemplate), arrayMode);
    clearFieldError(field);
  });
}

function appendArrayItem(itemsContainer, value, arrayMode = "array") {
  if (!itemsContainer) {
    return;
  }

  const itemIndex = itemsContainer.querySelectorAll("[data-array-item]").length + 1;
  const itemNode = document.createElement("div");
  itemNode.className = "array-item";
  itemNode.setAttribute("data-array-item", "");

  const header = document.createElement("div");
  header.className = "array-item-header";

  const label = document.createElement("span");
  label.className = "array-item-label";
  label.textContent = `Item ${itemIndex}`;

  const input = document.createElement("textarea");
  input.className = "array-item-input";
  input.rows = 4;
  input.setAttribute("data-array-item-input", "");
  input.value = formatArrayItemValue(value);

  header.append(label);

  if (arrayMode !== "tuple") {
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "array-remove-button";
    removeButton.textContent = "Remove";

    removeButton.addEventListener("click", () => {
      itemNode.remove();
      renumberArrayItems(itemsContainer);
    });

    header.append(removeButton);
  }

  itemNode.append(header, input);
  itemsContainer.append(itemNode);
}

function renumberArrayItems(itemsContainer) {
  const items = Array.from(itemsContainer.querySelectorAll("[data-array-item]"));
  items.forEach((item, index) => {
    const label = item.querySelector(".array-item-label");
    if (label) {
      label.textContent = `Item ${index + 1}`;
    }
  });
}

function formatArrayItemValue(value) {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value) || typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return JSON.stringify("");
}

function cloneJsonValue(value) {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return JSON.parse(JSON.stringify(value));
}

function buildStructuredNode(value, structure, options = {}) {
  if ((structure?.kind === "tuple") || (Array.isArray(value) && structure?.kind === "tuple")) {
    return buildStructuredTupleNode(Array.isArray(value) ? value : [], structure, options);
  }

  if ((structure?.kind === "array") || Array.isArray(value)) {
    return buildStructuredArrayNode(Array.isArray(value) ? value : [], structure, options);
  }

  if ((structure?.kind === "object") || (value && typeof value === "object")) {
    return buildStructuredObjectNode(value && typeof value === "object" ? value : {}, structure, options);
  }

  return buildStructuredPrimitiveNode(value, structure, options);
}

function buildStructuredObjectNode(value, structure, options = {}) {
  const block = document.createElement("div");
  block.className = "json-object-block";
  block.setAttribute("data-structured-node", "object");
  block.setAttribute("data-depth", String(options.depth ?? 0));

  const fields = document.createElement("div");
  fields.className = "json-object-fields";

  for (const [key, innerValue] of Object.entries(value)) {
    const row = document.createElement("div");
    row.className = "json-field-row";
    row.setAttribute("data-json-key", key);

    const childStructure = structure?.kind === "object" ? structure.properties[key] ?? null : null;
    row.append(buildStructuredFieldMeta(key, childStructure?.typeLabel ?? inferTypeLabel(innerValue)), buildStructuredNode(innerValue, childStructure, { label: key, depth: (options.depth ?? 0) + 1 }));
    fields.append(row);
  }

  block.append(fields);
  return block;
}

function buildStructuredArrayNode(value, structure, options = {}) {
  const block = document.createElement("div");
  block.className = "json-array-block";
  block.setAttribute("data-structured-node", "array");
  block.setAttribute("data-depth", String(options.depth ?? 0));

  const itemsContainer = document.createElement("div");
  itemsContainer.className = "json-array-items";
  itemsContainer.setAttribute("data-json-array-items", "");

  const itemTemplate = value.length > 0 ? cloneJsonValue(value[0]) : "";
  for (const item of value) {
    appendStructuredArrayItem(itemsContainer, item, structure?.kind === "array" ? structure.item : null, false, (options.depth ?? 0) + 1);
  }

  const actions = document.createElement("div");
  actions.className = "json-array-actions";

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "json-array-add-button";
  addButton.textContent = "Add item";
  addButton.addEventListener("click", () => {
    appendStructuredArrayItem(itemsContainer, cloneJsonValue(itemTemplate), structure?.kind === "array" ? structure.item : null, false, (options.depth ?? 0) + 1);
  });

  actions.append(addButton);
  block.append(itemsContainer, actions);
  return block;
}

function buildStructuredTupleNode(value, structure, options = {}) {
  const block = document.createElement("div");
  block.className = "json-array-block";
  block.setAttribute("data-structured-node", "array");
  block.setAttribute("data-array-mode", "tuple");
  block.setAttribute("data-depth", String(options.depth ?? 0));

  const itemsContainer = document.createElement("div");
  itemsContainer.className = "json-array-items";
  itemsContainer.setAttribute("data-json-array-items", "");

  const items = structure?.kind === "tuple" ? structure.items : [];
  items.forEach((itemStructure, index) => {
    appendStructuredArrayItem(itemsContainer, value[index], itemStructure, true, (options.depth ?? 0) + 1);
  });

  block.append(itemsContainer);
  return block;
}

function appendStructuredArrayItem(itemsContainer, value, itemStructure, isTuple, depth) {
  const row = document.createElement("div");
  row.className = "json-array-row";
  row.setAttribute("data-json-array-item", "");

  const header = document.createElement("div");
  header.className = "json-array-actions";

  const left = document.createElement("div");
  left.className = "json-array-actions-left";

  const right = document.createElement("div");
  right.className = "json-array-actions-right";

  const label = document.createElement("span");
  label.className = "json-array-label";
  label.textContent = `Item ${itemsContainer.querySelectorAll("[data-json-array-item]").length + 1}`;
  left.append(label);

  const typeChip = document.createElement("span");
  typeChip.className = "json-type-chip";
  typeChip.textContent = itemStructure?.typeLabel ?? inferTypeLabel(value);
  left.append(typeChip);

  if (!isTuple) {
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "json-array-remove-button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      row.remove();
      renumberStructuredArrayItems(itemsContainer);
    });
    right.append(removeButton);
  }

  header.append(left, right);
  row.append(header, buildStructuredNode(value, itemStructure, { depth }));
  itemsContainer.append(row);
}

function renumberStructuredArrayItems(itemsContainer) {
  const rows = Array.from(itemsContainer.querySelectorAll("[data-json-array-item]"));
  rows.forEach((row, index) => {
    const label = row.querySelector(".json-array-label");
    if (label) {
      label.textContent = `Item ${index + 1}`;
    }
  });
}

function buildStructuredPrimitiveNode(value, structure) {
  const container = document.createElement("div");
  container.className = "json-field-row";
  container.setAttribute("data-structured-node", "primitive");

  const controls = document.createElement("div");
  controls.className = "json-inline-controls";

  const resolvedValue = value ?? defaultValueFromStructure(structure);
  const allowNull = !!structure?.allowNull;
  const allowUndefined = !!structure?.allowUndefined;

  if (allowNull) {
    const label = document.createElement("label");
    label.className = "toggle-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.setAttribute("data-json-null-toggle", "");
    checkbox.checked = resolvedValue === null;
    label.append(checkbox, document.createTextNode("Use null"));
    controls.append(label);
  }

  if (allowUndefined) {
    const label = document.createElement("label");
    label.className = "toggle-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.setAttribute("data-json-undefined-toggle", "");
    checkbox.checked = typeof value === "undefined";
    label.append(checkbox, document.createTextNode("Use undefined"));
    controls.append(label);
  }

  const input = buildPrimitiveControl(resolvedValue, structure);
  container.append(controls, input);

  const nullToggle = controls.querySelector("[data-json-null-toggle]");
  const undefinedToggle = controls.querySelector("[data-json-undefined-toggle]");
  nullToggle?.addEventListener("change", () => {
    if (nullToggle.checked && undefinedToggle) {
      undefinedToggle.checked = false;
    }
    input.disabled = nullToggle.checked;
  });
  undefinedToggle?.addEventListener("change", () => {
    if (undefinedToggle.checked && nullToggle) {
      nullToggle.checked = false;
    }
    input.disabled = undefinedToggle.checked;
  });
  input.disabled = !!nullToggle?.checked || !!undefinedToggle?.checked;

  return container;
}

function buildPrimitiveControl(value, structure) {
  const control = structure?.control ?? inferPrimitiveControl(value);
  const options = structure?.options ?? [];

  if (control === "boolean") {
    const select = document.createElement("select");
    select.className = "json-primitive-select";
    select.setAttribute("data-json-primitive-control", "boolean");
    select.innerHTML = `<option value="true"${value === true ? " selected" : ""}>true</option><option value="false"${value !== true ? " selected" : ""}>false</option>`;
    return select;
  }

  if (control === "select" && options.length > 0) {
    const select = document.createElement("select");
    select.className = "json-primitive-select";
    select.setAttribute("data-json-primitive-control", "select");
    for (const option of options) {
      const optionNode = document.createElement("option");
      optionNode.value = option.value;
      optionNode.textContent = option.label;
      optionNode.selected = String(value ?? "") === option.value;
      select.append(optionNode);
    }
    return select;
  }

  const input = document.createElement("input");
  input.type = "text";
  input.className = "json-primitive-input";
  input.setAttribute("data-json-primitive-control", "text");
  input.setAttribute("data-primitive-kind", inferPrimitiveKind(value, structure));
  input.value = formatPrimitiveInputValue(value);
  return input;
}

function readStructuredNodeValue(node, structure) {
  if (!node) {
    return { ok: false, message: "Structured editor node is missing." };
  }

  const nodeType = node.getAttribute("data-structured-node");
  if (nodeType === "primitive") {
    return readStructuredPrimitiveValue(node, structure);
  }

  if (nodeType === "object") {
    const result = {};
    const rows = Array.from(node.querySelectorAll(":scope > .json-object-fields > .json-field-row"));
    for (const row of rows) {
      const key = row.getAttribute("data-json-key");
      const childNode = row.lastElementChild;
      if (!key) {
        continue;
      }

      const childValue = readStructuredNodeValue(childNode, structure?.kind === "object" ? structure.properties[key] ?? null : null);
      if (!childValue.ok) {
        return childValue;
      }

      result[key] = childValue.value;
    }
    return { ok: true, value: result };
  }

  if (nodeType === "array") {
    const rows = Array.from(node.querySelectorAll(":scope > .json-array-items > .json-array-row"));
    const result = [];
    for (const row of rows) {
      const childNode = row.lastElementChild;
      const childStructure =
        structure?.kind === "array"
          ? structure.item
          : structure?.kind === "tuple"
            ? structure.items[result.length] ?? null
            : null;
      const childValue = readStructuredNodeValue(childNode, childStructure);
      if (!childValue.ok) {
        return childValue;
      }
      result.push(childValue.value);
    }
    return { ok: true, value: result };
  }

  return { ok: false, message: "Unsupported structured editor node." };
}

function readStructuredPrimitiveValue(node, structure) {
  const nullToggle = node.querySelector("[data-json-null-toggle]");
  if (nullToggle?.checked) {
    return { ok: true, value: null };
  }

  const undefinedToggle = node.querySelector("[data-json-undefined-toggle]");
  if (undefinedToggle?.checked) {
    return { ok: true, value: undefined };
  }

  const controlNode = node.querySelector("[data-json-primitive-control]");
  if (!controlNode) {
    return { ok: false, message: "Primitive control is missing." };
  }

  if (controlNode.tagName === "SELECT") {
    const rawValue = controlNode.value;
    return validateRawValue(rawValue, structure?.typeLabel ?? "string");
  }

  const kind = controlNode.getAttribute("data-primitive-kind") ?? "string";
  const rawValue = controlNode.value ?? "";
  const trimmed = rawValue.trim();

  if (kind === "number") {
    if (trimmed.length === 0 || Number.isNaN(Number(trimmed))) {
      return { ok: false, message: "A nested number field is invalid." };
    }
    return { ok: true, value: Number(trimmed) };
  }

  if (kind === "boolean") {
    if (trimmed !== "true" && trimmed !== "false") {
      return { ok: false, message: 'A nested boolean field must be "true" or "false".' };
    }
    return { ok: true, value: trimmed === "true" };
  }

  if (kind === "null") {
    return trimmed === "null"
      ? { ok: true, value: null }
      : { ok: false, message: 'A nested null field must stay "null".' };
  }

  return { ok: true, value: rawValue };
}

function buildStructuredFieldMeta(labelText, typeLabel) {
  const meta = document.createElement("div");
  meta.className = "json-field-meta";

  const label = document.createElement("label");
  label.className = "json-field-label";
  label.textContent = labelText;

  const chip = document.createElement("span");
  chip.className = "json-type-chip";
  chip.textContent = typeLabel;

  meta.append(label, chip);
  return meta;
}

function inferTypeLabel(value) {
  if (Array.isArray(value)) {
    return "array";
  }
  if (value === null) {
    return "null";
  }
  return typeof value;
}

function inferPrimitiveKind(value, structure) {
  const typeLabel = structure?.typeLabel?.trim();
  if (typeLabel === "number") {
    return "number";
  }
  if (typeLabel === "bigint") {
    return "bigint";
  }
  if (typeLabel === "boolean") {
    return "boolean";
  }
  if (typeLabel === "null") {
    return "null";
  }
  if (typeof value === "number") {
    return "number";
  }
  if (typeof value === "boolean") {
    return "boolean";
  }
  if (value === null) {
    return "null";
  }
  return "string";
}

function inferPrimitiveControl(value) {
  if (typeof value === "boolean") {
    return "boolean";
  }
  return "text";
}

function formatPrimitiveInputValue(value) {
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null) {
    return "null";
  }
  return typeof value === "string" ? value : "";
}

function defaultValueFromStructure(structure) {
  if (!structure) {
    return "";
  }
  if (structure.kind === "primitive") {
    if (structure.control === "boolean") {
      return false;
    }
    if (structure.typeLabel === "number") {
      return 0;
    }
    if (structure.typeLabel === "bigint") {
      return "0n";
    }
    return "";
  }
  if (structure.kind === "array") {
    return [];
  }
  if (structure.kind === "tuple") {
    return structure.items.map((item) => defaultValueFromStructure(item));
  }
  return {};
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (isRunning) {
    return;
  }

  const fields = Array.from(form.querySelectorAll("[data-param-name]"));
  const { params, errors } = validateAllFields(fields);

  if (errors.length > 0) {
    renderOutputState({
      tone: "error",
      title: "Invalid Input",
      message: "Some parameters are invalid. Fix the highlighted fields.",
      primaryLabel: "Errors",
      primaryValue: errors,
      raw: {
        status: "invalid-input",
        message: "Some parameters are invalid. Fix the highlighted fields.",
        errors
      }
    });
    return;
  }

  if (!vscode || !functionInfo?.target) {
    renderOutputState({
      tone: "error",
      title: "Unsupported Target",
      message: "Function execution is not available for this target yet.",
      primaryLabel: "Parameters",
      primaryValue: params,
      raw: {
        status: "unsupported",
        message: "Function execution is not available for this target yet.",
        parameters: params
      }
    });
    return;
  }

  currentRequestId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  setRunningState(true);

  renderOutputState({
    tone: "pending",
    title: "Running",
    message: "Simulation is running with the current parameters.",
    meta: [functionInfo.name, currentRequestId],
    primaryLabel: "Parameters",
    primaryValue: params,
    raw: {
      status: "running",
      requestId: currentRequestId,
      function: functionInfo.name,
      parameters: params
    }
  });

  vscode.postMessage({
    type: "execlens.runSimulation",
    payload: {
      requestId: currentRequestId,
      target: functionInfo.target,
      args: params
    }
  });
});

stopButton?.addEventListener("click", () => {
  if (!vscode || !currentRequestId || !isRunning) {
    return;
  }

  renderOutputState({
    tone: "pending",
    title: "Stopping",
    message: "Stopping simulation...",
    meta: [currentRequestId],
    raw: {
      status: "stopping",
      requestId: currentRequestId,
      message: "Stopping simulation..."
    }
  });

  vscode.postMessage({
    type: "execlens.cancelSimulation",
    payload: {
      requestId: currentRequestId
    }
  });
});

window.addEventListener("message", (event) => {
  const message = event.data;
  if (!message) {
    return;
  }

  if (message.type === "execlens.simulationResult") {
    if (message.payload?.requestId !== currentRequestId) {
      return;
    }

    setRunningState(false);
    currentRequestId = null;
    renderSimulationResult(message.payload.result);
    return;
  }

  if (message.type === "execlens.simulationCancelled") {
    if (message.payload?.requestId !== currentRequestId) {
      return;
    }

    setRunningState(false);
    currentRequestId = null;
    renderOutputState({
      tone: "neutral",
      title: "Cancelled",
      message: "Simulation stopped by user.",
      raw: {
        status: "cancelled",
        message: "Simulation stopped by user."
      }
    });
  }
});

setRunningState(false);
attachLiveValidation();

function renderSimulationResult(result) {
  if (result?.ok) {
    renderOutputState({
      tone: "success",
      title: "Completed",
      message: "Simulation finished successfully.",
      meta: [`${result.durationMs}ms`, `${result.trace?.length ?? 0} trace events`],
      primaryLabel: "Return Value",
      primaryValue: result.returnValue,
      secondaryLabel: "Trace",
      secondaryValue: result.trace,
      secondaryMode: "trace",
      raw: toDisplayResult(result)
    });
    return;
  }

  renderOutputState({
    tone: "error",
    title: result?.errorName ?? "Failed",
    message: result?.errorMessage ?? "Simulation failed.",
    meta: [typeof result?.durationMs === "number" ? `${result.durationMs}ms` : "no duration"],
    primaryLabel: "Error",
    primaryValue: {
      name: result?.errorName ?? "SimulationError",
      message: result?.errorMessage ?? "Unknown error"
    },
    secondaryLabel: "Trace",
    secondaryValue: result?.trace ?? [],
    secondaryMode: "trace",
    raw: toDisplayResult(result)
  });
}
