/*
Scenario 14: JavaScript-specific behavior not already covered by TS scenarios.

Purpose:
- plain JS exports
- dynamic shapes
- missing declarations
- ad-hoc object mutation patterns
*/

export function jsAdd(a, b) {
  return a + b;
}

export function jsDescribeUser(user) {
  return `${user.id}:${user.name}`;
}

export function jsMutateAndReturn(input) {
  input.touched = true;
  return input;
}

export function jsOptionalByConvention(payload) {
  return payload && payload.name ? payload.name : "missing";
}

export async function jsAsyncEcho(value) {
  return value;
}
