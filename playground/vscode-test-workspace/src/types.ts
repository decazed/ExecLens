/*
Shared support types and helpers for the playground.

This file is not a scenario by itself.
It exists to exercise imported runtime helpers, imported types, local module
graphs, and "real codebase" organization.
*/

export type Money = {
  amount: number;
  currency: "EUR" | "USD";
};

export type Address = {
  street: string;
  city: string;
  zipCode: string;
  country: string;
};

export type CustomerProfile = {
  id: string;
  email: string;
  shippingAddress: Address;
  billingAddress?: Address;
  tags: string[];
};

export type ProductMeta = {
  sku: string;
  dimensions: {
    width: number;
    height: number;
    depth: number;
    unit: "cm" | "in";
  };
  supplier: {
    name: string;
    country: string;
  };
};

export type CartLine = {
  productId: string;
  quantity: number;
  unitPrice: Money;
  meta: ProductMeta;
};

export type CheckoutCart = {
  lines: CartLine[];
  customer: CustomerProfile;
  couponCode?: string | null;
  shippingMethod: "standard" | "express";
};

export type PaymentInput = {
  method: "card" | "paypal";
  installments: number;
  card?: {
    holder: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
};

export type TaxRule = {
  country: string;
  rate: number;
};

export type UserRow = {
  id: string;
  email: string;
  isActive: boolean;
};

export type UserRepository = {
  findById(id: string): Promise<UserRow | null>;
  listByCountry(country: string): Promise<UserRow[]>;
};

export type CacheClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
};

export type QueuePublisher = {
  publish(topic: string, payload: { id: string; event: string }): Promise<void>;
};

export type HttpClient = {
  get<T>(url: string): Promise<{ status: number; body: T }>;
  post<T>(url: string, body: unknown): Promise<{ status: number; body: T }>;
};

export type Logger = {
  info(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
};

export const DEFAULT_TAX_RULES: TaxRule[] = [
  { country: "FR", rate: 0.2 },
  { country: "US", rate: 0.08 }
];

export function normalizeCountryCode(country: string): string {
  return country.trim().toUpperCase();
}

export function sumLineTotals(lines: CartLine[]): number {
  return lines.reduce((total, line) => total + line.unitPrice.amount * line.quantity, 0);
}

export function isVipCustomer(customer: CustomerProfile): boolean {
  return customer.tags.includes("vip");
}
