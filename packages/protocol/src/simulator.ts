import type {
  FunctionParameterField,
  ParameterFieldOption,
  ParameterStructureNode
} from "./parameters.js";
import type { SimulationTarget } from "./simulation.js";

export type SimulatorFieldOption = ParameterFieldOption;
export type SimulatorStructureNode = ParameterStructureNode;
export type SimulatorParameterField = FunctionParameterField;

export type SimulatorFunctionInfo = {
  name: string;
  parameters: SimulatorParameterField[];
  target?: SimulationTarget;
};
