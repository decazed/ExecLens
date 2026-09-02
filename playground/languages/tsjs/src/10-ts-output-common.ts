/*
Scenario 10: common output shapes.

Purpose:
- primitive outputs
- object outputs
- array outputs
- nullable outputs
*/

export function outputString(name: string): string {
  return `hello ${name}`;
}

export function outputNumber(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function outputObject(id: string, active: boolean): { id: string; active: boolean } {
  return { id, active };
}

export function outputArray(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}-${index + 1}`);
}

export function outputNullable(enabled: boolean): { status: string } | null {
  return enabled ? { status: "ready" } : null;
}
