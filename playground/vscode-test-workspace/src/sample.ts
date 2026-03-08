import type { CheckoutCart, PaymentInput, TaxRule } from "./types.js";

type PricingFlags = {
  includeVat: boolean;
  roundResult: boolean;
  locale: "fr-FR" | "en-US";
};

type CouponRules = {
  defaultPercentage: number;
  overrides: Record<string, number>;
};

type DeliveryOptions = {
  requestedDate: string;
  window: {
    fromHour: number;
    toHour: number;
  };
  contact: {
    firstName: string;
    lastName: string;
    phone: string;
  };
};

export function calculatePrice(
  cart: CheckoutCart,
  payment: PaymentInput,
  taxRules: TaxRule[],
  flags: PricingFlags,
  couponRules: CouponRules,
  delivery?: DeliveryOptions
): number {
  const subtotal = cart.lines.reduce((total, line) => total + line.unitPrice.amount * line.quantity, 0);

  if (subtotal <= 0) {
    return 0;
  }

  const countryTax = taxRules.find((rule) => rule.country === cart.customer.shippingAddress.country)?.rate ?? 0;
  const withTax = flags.includeVat ? subtotal * (1 + countryTax) : subtotal;

  const couponCode = cart.couponCode ?? "";
  const discountRate = couponRules.overrides[couponCode] ?? couponRules.defaultPercentage;
  const discounted = withTax * (1 - discountRate);

  const paymentFee = payment.method === "card" && payment.installments > 1 ? 2.5 : 0;
  const deliveryFee = delivery?.window ? 4.9 : 0;

  const rawTotal = discounted + paymentFee + deliveryFee;
  return flags.roundResult ? Math.round(rawTotal * 100) / 100 : rawTotal;
}

export function summarizeCustomerCountry(cart: CheckoutCart): string {
  return `${cart.customer.shippingAddress.country}:${cart.customer.email}`;
}

export function buildTrackingPayload(
  orderId: string,
  cart: CheckoutCart,
  flags: PricingFlags,
  metadata: {
    source: "web" | "mobile";
    campaign?: string;
    extra: {
      correlationId: string;
      attempt: number;
      tags: string[];
    };
  }
): {
  orderId: string;
  lines: number;
  source: string;
  includeVat: boolean;
} {
  return {
    orderId,
    lines: cart.lines.length,
    source: metadata.source,
    includeVat: flags.includeVat
  };
}

export function noParamsPing(): string {
  return "pong";
}

export class CheckoutService {
  public estimate(cart: CheckoutCart, taxRules: TaxRule[], includeVat = true): number {
    const subtotal = cart.lines.reduce((acc, line) => acc + line.unitPrice.amount * line.quantity, 0);
    if (!includeVat) {
      return subtotal;
    }

    const taxRate = taxRules.find((rule) => rule.country === cart.customer.shippingAddress.country)?.rate ?? 0;
    return subtotal * (1 + taxRate);
  }
}

export function demoUsage(): void {
  const sampleCart: CheckoutCart = {
    lines: [
      {
        productId: "p-1",
        quantity: 2,
        unitPrice: { amount: 49.9, currency: "EUR" },
        meta: {
          sku: "KBD-001",
          dimensions: { width: 45, height: 5, depth: 15, unit: "cm" },
          supplier: {
            name: "Acme Components",
            country: "FR",
            contract: { startsAt: "2024-01-01" }
          }
        }
      }
    ],
    customer: {
      id: "cust-01",
      email: "john@example.com",
      shippingAddress: {
        street: "1 Rue de Paris",
        city: "Paris",
        zipCode: "75001",
        country: "FR"
      },
      tags: ["vip"]
    },
    shippingMethod: "express",
    couponCode: "WELCOME10"
  };

  const result = calculatePrice(
    sampleCart,
    { method: "card", installments: 2, card: { holder: "John Doe", last4: "4242", expMonth: 8, expYear: 2028 } },
    [{ country: "FR", rate: 0.2 }],
    { includeVat: true, roundResult: true, locale: "fr-FR" },
    { defaultPercentage: 0, overrides: { WELCOME10: 0.1 } }
  );

  console.log("result", result);
}
