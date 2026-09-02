import type {
  FunctionParameterField,
  ParameterFieldOption,
  ParameterStructureNode
} from "./parameters.js";
import type { SimulationTarget } from "./simulation.js";

/** Alias of {@link ParameterFieldOption}, used in the simulator UI model. */
export type SimulatorFieldOption = ParameterFieldOption;
/** Alias of {@link ParameterStructureNode}, used in the simulator UI model. */
export type SimulatorStructureNode = ParameterStructureNode;
/** Alias of {@link FunctionParameterField}, used in the simulator UI model. */
export type SimulatorParameterField = FunctionParameterField;

/**
 * What the simulator panel renders: the function name, its input fields, and
 * (once known) the resolved {@link SimulationTarget} to run.
 */
export type SimulatorFunctionInfo = {
  name: string;
  parameters: SimulatorParameterField[];
  target?: SimulationTarget;
};
