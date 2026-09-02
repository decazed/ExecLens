/*
Scenario 03: runtime-native and non-JSON-friendly inputs.

Purpose:
- everything that stretches panel input UX
- native classes and runtime objects users may still see in signatures
*/

export class UserProfile {
  public constructor(
    public readonly id: string,
    public readonly name: string
  ) {}
}

export class DomainError extends Error {
  public constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function regexSource(pattern: RegExp): string {
  return pattern.source;
}

export function dateYear(date: Date): number {
  return date.getUTCFullYear();
}

export function urlHost(url: URL): string {
  return url.host;
}

export function urlSearchParamsKeys(params: URLSearchParams): string[] {
  return Array.from(params.keys());
}

export function errorMessage(error: Error): string {
  return error.message;
}

export function domainErrorCode(error: DomainError): string {
  return error.code;
}

export function symbolDescription(symbol: symbol): string {
  return symbol.description ?? "none";
}

export function mapKeys(map: Map<string, number>): string[] {
  return Array.from(map.keys());
}

export function setValues(set: Set<string>): string[] {
  return Array.from(set.values());
}

export function typedArrayLength(values: Uint8Array): number {
  return values.length;
}

export function bufferByteLength(buffer: Buffer): number {
  return buffer.byteLength;
}

export function classInstanceLabel(user: UserProfile): string {
  return `${user.id}:${user.name}`;
}

export async function promiseInputValue(value: Promise<string>): Promise<string> {
  return await value;
}

export function callbackInvocation(callback: (input: string) => string, input: string): string {
  return callback(input);
}
