/*
Scenario 00: basic TypeScript functions.

Purpose:
- first smoke test of detection + panel + execution
- only top-level exported functions
- only primitive params and primitive outputs
*/

export function noParamsPing(): string {
  return "pong";
}

export function add(a: number, b: number): number {
  return a + b;
}

export function greet(name: string): string {
  return `Hello ${name}`;
}

export function chooseLabel(enabled: boolean): string {
  return enabled ? "enabled" : "disabled";
}

export function divide(a: number, b: number): number {
  return a / b;
}

export function isAdult(age: number): boolean {
  return age >= 18;
}
