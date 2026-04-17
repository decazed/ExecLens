/*
Scenario 07: imports and local module graphs.

Purpose:
- imported runtime helpers
- imported types
- realistic multi-file business logic
*/

import {
  DEFAULT_TAX_RULES,
  normalizeCountryCode,
  sumLineTotals,
  type CheckoutCart,
  type PaymentInput,
  type TaxRule
} from "./types.js";

type PricingFlags = {
  includeVat: boolean;
  roundResult: boolean;
  locale: "fr-FR" | "en-US";
};

type CouponRules = {
  defaultPercentage: number;
  overrides: Record<string, number>;
};

export function calculatePrice(
  cart: CheckoutCart,
  payment: PaymentInput,
  taxRules: TaxRule[] = DEFAULT_TAX_RULES,
  flags: PricingFlags = { includeVat: true, roundResult: true, locale: "fr-FR" },
  couponRules: CouponRules = { defaultPercentage: 0, overrides: {} }
): number {
  const subtotal = sumLineTotals(cart.lines);
  const normalizedCountry = normalizeCountryCode(cart.customer.shippingAddress.country);
  const countryTax = taxRules.find((rule) => normalizeCountryCode(rule.country) === normalizedCountry)?.rate ?? 0;
  const withTax = flags.includeVat ? subtotal * (1 + countryTax) : subtotal;
  const couponCode = cart.couponCode ?? "";
  const discountRate = couponRules.overrides[couponCode] ?? couponRules.defaultPercentage;
  const discounted = withTax * (1 - discountRate);
  const paymentFee = payment.method === "card" && payment.installments > 1 ? 2.5 : 0;
  const rawTotal = discounted + paymentFee;
  return flags.roundResult ? Math.round(rawTotal * 100) / 100 : rawTotal;
}

export function summarizeCustomerCountry(cart: CheckoutCart): string {
  return `${normalizeCountryCode(cart.customer.shippingAddress.country)}:${cart.customer.email}`;
}
