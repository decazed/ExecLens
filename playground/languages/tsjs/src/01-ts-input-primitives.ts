/*
Scenario 01: primitive and scalar inputs.

Purpose:
- all scalar inputs a user is likely to type directly in the panel
- null, undefined, bigint, literal unions, template-like values
*/

export enum PublishState {
  Draft = "draft",
  Published = "published",
  Archived = "archived"
}

export type UserId = string & { readonly __brand: "UserId" };

export function nullableString(value: string | null): string {
  return value ?? "no-value";
}

export function optionalString(value: string | undefined): string {
  return value ?? "undefined-value";
}

export function parseBoolean(flag: boolean): string {
  return flag ? "true" : "false";
}

export function parseBigInt(a: bigint, b: bigint): bigint {
  return a + b;
}

export function parseLiteralMode(mode: "draft" | "published" | "archived"): string {
  return mode;
}

export function parseEnumState(state: PublishState): string {
  return state;
}

export function brandedIdEcho(id: UserId): string {
  return id;
}

export function finiteOrSpecial(value: number): string {
  if (Number.isNaN(value)) {
    return "nan";
  }
  if (value === Number.POSITIVE_INFINITY) {
    return "infinity";
  }
  if (value === Number.NEGATIVE_INFINITY) {
    return "-infinity";
  }
  return "finite";
}
