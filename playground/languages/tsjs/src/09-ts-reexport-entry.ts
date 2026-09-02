/*
Scenario 09: pure reexport entrypoint.

Purpose:
- file with no function bodies
- only reexports
- validates cursor handling and symbol resolution on proxy modules
*/

export {
  exportedDirect as reexportedDirect,
  exportedAlias as reexportedAlias,
  exportedGreetingAlias as reexportedGreetingAlias,
  exportedArrow as reexportedArrow,
  default as reexportedDefaultIncrement
} from "./08-ts-exports-reexports-and-classes.js";
