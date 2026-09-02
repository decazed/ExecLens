/** A choice offered by a `select` control: a display `label` and its `value`. */
export type ParameterFieldOption = {
  label: string;
  value: string;
};

/**
 * A recursive description of the shape of a structured parameter value, used by
 * the UI to render a nested editor. Leaves are `primitive`; containers are
 * `object`, `array`, or `tuple`.
 */
export type ParameterStructureNode =
  | {
      kind: "primitive";
      typeLabel: string;
      control?: "text" | "boolean" | "select";
      options?: ParameterFieldOption[];
      allowNull?: boolean;
      allowUndefined?: boolean;
    }
  | {
      kind: "object";
      typeLabel: string;
      properties: Record<string, ParameterStructureNode>;
      allowNull?: boolean;
      allowUndefined?: boolean;
    }
  | {
      kind: "array";
      typeLabel: string;
      item: ParameterStructureNode;
      allowNull?: boolean;
      allowUndefined?: boolean;
    }
  | {
      kind: "tuple";
      typeLabel: string;
      items: ParameterStructureNode[];
      allowNull?: boolean;
      allowUndefined?: boolean;
    };

/**
 * One editable input field for a function parameter.
 *
 * - `editor: "value"` is a single scalar input; `editor: "json"` is a structured
 *   editor driven by `structure`.
 * - `initialValue` is a string for `"value"` fields and a JSON string for
 *   `"json"` fields.
 * - `control` / `options` refine a `"value"` field into a checkbox or a select.
 */
export type FunctionParameterField = {
  name: string;
  typeLabel: string;
  editor: "value" | "json";
  initialValue: string;
  control?: "text" | "boolean" | "select";
  options?: ParameterFieldOption[];
  allowNull?: boolean;
  allowUndefined?: boolean;
  structure?: ParameterStructureNode;
};
