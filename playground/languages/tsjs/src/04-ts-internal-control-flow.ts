/*
Scenario 04: internal control flow.

Purpose:
- branches, loops, switch, guards, local helpers
- functions where "what happens inside" matters as much as inputs
*/

export function shippingTier(total: number): "free" | "priority" | "standard" {
  if (total >= 100) {
    return "free";
  }
  if (total >= 40) {
    return "priority";
  }
  return "standard";
}

export function classifyTemperature(celsius: number): string {
  if (celsius <= 0) {
    return "freezing";
  }
  if (celsius < 18) {
    return "cold";
  }
  if (celsius < 28) {
    return "mild";
  }
  return "hot";
}

export function normalizePostalCode(country: string, zipCode: string): string {
  switch (country) {
    case "FR":
      return zipCode.trim();
    case "US":
      return zipCode.replaceAll("-", "");
    default:
      return zipCode.toUpperCase();
  }
}

export function firstPositive(values: number[]): number | null {
  for (const value of values) {
    if (value > 0) {
      return value;
    }
  }
  return null;
}

export function loyaltyLabel(points: number, premium: boolean): string {
  const normalizedPoints = Math.max(points, 0);
  if (premium && normalizedPoints >= 1000) {
    return "vip";
  }
  if (normalizedPoints >= 500) {
    return "gold";
  }
  if (normalizedPoints >= 100) {
    return "silver";
  }
  return "standard";
}
