const form = document.getElementById("run-form");
const output = document.getElementById("run-output");

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
    return "undefined";
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

form?.addEventListener("submit", (event) => {
  event.preventDefault();

  const fields = Array.from(form.querySelectorAll("[data-param-name]"));
  const params = {};
  const errors = [];

  for (const field of fields) {
    const key = field.getAttribute("data-param-name");
    if (!key) {
      continue;
    }

    const editor = field.getAttribute("data-editor") ?? "value";
    if (editor === "json") {
      const rawJson = field.querySelector("[data-input-json]")?.value?.trim() ?? "";
      if (!rawJson) {
        params[key] = {};
        continue;
      }
      try {
        params[key] = JSON.parse(rawJson);
      } catch {
        errors.push({
          parameter: key,
          message: "Invalid JSON"
        });
      }
      continue;
    }

    const rawValue = field.querySelector("[data-input-raw]")?.value ?? "";
    params[key] = parseLooseValue(rawValue);
  }

  if (errors.length > 0) {
    output.textContent = JSON.stringify(
      {
        status: "invalid-input",
        message: "Some parameters contain invalid JSON.",
        errors
      },
      null,
      2
    );
    return;
  }

  output.textContent = JSON.stringify(
    {
      status: "panel-only",
      message: "Function execution not implemented yet.",
      parameters: params
    },
    null,
    2
  );
});
