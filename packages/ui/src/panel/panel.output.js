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
