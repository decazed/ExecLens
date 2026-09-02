export type ParameterFieldOption = {
  label: string;
  value: string;
};

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
