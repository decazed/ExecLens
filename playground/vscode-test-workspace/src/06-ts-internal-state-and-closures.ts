/*
Scenario 06: closures, recursion, local state.

Purpose:
- local nested functions
- captured values
- recursion
- instance-free but structurally richer code
*/

export function useInnerComputation(base: number): number {
  function inner(multiplier: number): number {
    return base * multiplier;
  }
  return inner(3);
}

export function makeGreeter(prefix: string): string {
  function greet(name: string): string {
    return `${prefix}:${name}`;
  }
  return greet("world");
}

export function nestedBranching(input: { count: number; enabled: boolean }): string {
  const normalize = (value: number): number => {
    if (value < 0) {
      return 0;
    }
    return value;
  };
  return input.enabled ? `enabled:${normalize(input.count)}` : `disabled:${normalize(input.count)}`;
}

export function recursiveTreeSize(root: { id: string; children: Array<{ id: string; children: any[] }> }): number {
  let total = 1;
  for (const child of root.children) {
    total += recursiveTreeSize(child);
  }
  return total;
}

export function statefulPipeline(value: number): number {
  let current = value;
  const steps = [
    (input: number) => input + 2,
    (input: number) => input * 3,
    (input: number) => input - 1
  ];
  for (const step of steps) {
    current = step(current);
  }
  return current;
}
