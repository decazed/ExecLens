/*
Scenario 11: special and awkward outputs.

Purpose:
- bigint
- Map / Set
- Date
- Error objects
- instances and special runtime values
*/

export function outputBigInt(a: bigint, b: bigint): bigint {
  return a + b;
}

export function outputDate(iso: string): Date {
  return new Date(iso);
}

export function outputMap(entries: Array<[string, number]>): Map<string, number> {
  return new Map(entries);
}

export function outputSet(values: string[]): Set<string> {
  return new Set(values);
}

export function outputError(message: string): Error {
  return new Error(message);
}

export function outputUndefinedField(id: string, includeFlag: boolean): { id: string; flag?: boolean } {
  return includeFlag ? { id, flag: true } : { id };
}
