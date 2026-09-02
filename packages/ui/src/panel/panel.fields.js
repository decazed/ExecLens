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
