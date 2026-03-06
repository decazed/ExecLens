type CartItem = {
  name: string;
  price: number;
  quantity: number;
};

type Cart = {
  items: CartItem[];
};

export function calculatePrice(cart: Cart, coupon?: string): number {
  const subtotal = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);

  if (subtotal === 0) {
    return 0;
  }

  if (coupon === "WELCOME10") {
    return Math.round(subtotal * 0.9);
  }

  return subtotal;
}

export function demoUsage(): void {
  const result = calculatePrice(
    {
      items: [
        { name: "keyboard", price: 50, quantity: 1 },
        { name: "mouse", price: 30, quantity: 2 }
      ]
    },
    "WELCOME10"
  );

  console.log("result", result);
}
