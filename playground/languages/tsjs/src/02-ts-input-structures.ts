/*
Scenario 02: structured input shapes.

Purpose:
- arrays, tuples, records, nested objects
- optional properties
- unions in object fields
*/

export type MoneyInput = {
  amount: number;
  currency: "EUR" | "USD";
};

export type ContactInput = {
  email: string;
  phone?: string;
};

export type CustomerInput = {
  id: string;
  contact: ContactInput;
  tags: string[];
};

export type CheckoutInput = {
  customer: CustomerInput;
  lines: Array<{
    sku: string;
    quantity: number;
    unitPrice: MoneyInput;
  }>;
  couponCode?: string | null;
};

export type Filter =
  | { type: "country"; value: string }
  | { type: "age"; min: number; max: number }
  | { type: "tag"; tags: string[] };

export function sumNumbers(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function tupleRange(range: [number, number]): number {
  return range[1] - range[0];
}

export function enabledFlags(flags: Record<string, boolean>): string[] {
  return Object.keys(flags).filter((key) => flags[key]);
}

export function formatMoney(input: MoneyInput): string {
  return `${input.amount} ${input.currency}`;
}

export function summarizeCheckout(input: CheckoutInput): string {
  return `${input.customer.contact.email}:${input.lines.length}:${input.couponCode ?? "none"}`;
}

export function filterLabel(filter: Filter): string {
  switch (filter.type) {
    case "country":
      return `country:${filter.value}`;
    case "age":
      return `age:${filter.min}-${filter.max}`;
    case "tag":
      return `tag:${filter.tags.join(",")}`;
  }
}
