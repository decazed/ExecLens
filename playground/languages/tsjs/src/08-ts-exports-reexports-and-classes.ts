/*
Scenario 08: exports, reexports, classes, methods.

Purpose:
- direct exports
- alias exports
- default exports
- reexports
- class methods and static methods
*/

function internalMultiply(a: number, b: number): number {
  return a * b;
}

function internalAliasTarget(name: string): string {
  return `alias:${name}`;
}

export function exportedDirect(value: number): number {
  return value + 1;
}

export const exportedArrow = (value: number): number => value * 2;

export { internalMultiply as exportedAlias };
export { internalAliasTarget as exportedGreetingAlias };

export default function defaultIncrement(value: number): number {
  return value + 10;
}

export class PriceCalculator {
  public constructor(private readonly vatRate: number) {}

  public withVat(amount: number): number {
    return amount * (1 + this.vatRate);
  }

  public static round(amount: number): number {
    return Math.round(amount * 100) / 100;
  }
}
