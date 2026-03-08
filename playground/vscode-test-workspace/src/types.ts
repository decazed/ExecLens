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
    contract: {
      startsAt: string;
      endsAt?: string;
    };
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
  couponCode?: string;
  shippingMethod: "standard" | "express";
  notes?: string | null;
};

export type PaymentInput = {
  method: "card" | "paypal";
  card?: {
    holder: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  installments: number;
};

export type TaxRule = {
  country: string;
  rate: number;
};
