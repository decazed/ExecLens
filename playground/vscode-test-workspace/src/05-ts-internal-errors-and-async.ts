/*
Scenario 05: internal errors and async behavior.

Purpose:
- sync throw
- rejected promises
- try/catch
- Promise.all
- delayed flows
*/

export class InvalidOrderError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "InvalidOrderError";
  }
}

export function requirePositive(value: number): number {
  if (value <= 0) {
    throw new InvalidOrderError("value must be > 0");
  }
  return value;
}

export function divideOrFail(a: number, b: number): number {
  if (b === 0) {
    throw new Error("division by zero");
  }
  return a / b;
}

export async function asyncFailure(shouldFail: boolean): Promise<string> {
  if (shouldFail) {
    throw new Error("async failure");
  }
  return "ok";
}

export async function delayedGreeting(name: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 25));
  return `hello ${name}`;
}

export async function promiseAllSummary(values: number[]): Promise<number> {
  const resolved = await Promise.all(values.map(async (value) => value * 2));
  return resolved.reduce((total, value) => total + value, 0);
}

export function normalizeJsonOrFail(rawJson: string): string {
  try {
    return JSON.stringify(JSON.parse(rawJson));
  } catch {
    throw new Error("invalid json");
  }
}
