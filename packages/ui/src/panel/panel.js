const form = document.getElementById("run-form");
const output = document.getElementById("run-output");
const runButton = document.getElementById("run-button");
const stopButton = document.getElementById("stop-button");
const vscode = typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : null;
const functionInfo = readFunctionInfo();
let currentRequestId = null;
let isRunning = false;

function readFunctionInfo() {
  const node = document.getElementById("execlens-function-info");
  if (!node) {
    return null;
  }

  try {
    return JSON.parse(node.textContent ?? "null");
  } catch (error) {
    output.textContent = JSON.stringify(
      {
        status: "panel-init-error",
        message: error instanceof Error ? error.message : String(error)
      },
      null,
      2
    );
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

form?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (isRunning) {
    return;
  }

  const fields = Array.from(form.querySelectorAll("[data-param-name]"));
  const { params, errors } = validateAllFields(fields);

  if (errors.length > 0) {
    output.textContent = JSON.stringify(
      {
        status: "invalid-input",
        message: "Some parameters are invalid. Fix the highlighted fields.",
        errors
      },
      null,
      2
    );
    return;
  }

  if (!vscode || !functionInfo?.target) {
    output.textContent = JSON.stringify(
      {
        status: "unsupported",
        message: "Function execution is not available for this target yet.",
        parameters: params
      },
      null,
      2
    );
    return;
  }

  currentRequestId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  setRunningState(true);

  output.textContent = JSON.stringify(
    {
      status: "running",
      requestId: currentRequestId,
      function: functionInfo.name,
      parameters: params
    },
    null,
    2
  );

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

  output.textContent = JSON.stringify(
    {
      status: "stopping",
      requestId: currentRequestId,
      message: "Stopping simulation..."
    },
    null,
    2
  );

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
    output.textContent = JSON.stringify(message.payload.result, null, 2);
    return;
  }

  if (message.type === "execlens.simulationCancelled") {
    if (message.payload?.requestId !== currentRequestId) {
      return;
    }

    setRunningState(false);
    currentRequestId = null;
    output.textContent = JSON.stringify(
      {
        status: "cancelled",
        message: "Simulation stopped by user."
      },
      null,
      2
    );
  }
});

setRunningState(false);
attachLiveValidation();
