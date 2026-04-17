/*
Scenario 12: runtime environment and long-running execution.

Purpose:
- Date.now
- Math.random
- process.env / cwd
- delays
- never resolving and infinite work
*/

export function readCurrentTimestamp(): number {
  return Date.now();
}

export function readRandomBucket(): "low" | "high" {
  return Math.random() < 0.5 ? "low" : "high";
}

export function readEnvValue(key: string): string {
  return process.env[key] ?? "missing";
}

export function workingDirectoryBaseName(): string {
  const parts = process.cwd().split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? "root";
}

export async function delayedGreeting(name: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return `hello ${name}`;
}

export async function neverResolvingPromise(): Promise<string> {
  return new Promise(() => undefined);
}

export function infiniteLoop(): never {
  while (true) {
    // intentionally never exits
  }
}
