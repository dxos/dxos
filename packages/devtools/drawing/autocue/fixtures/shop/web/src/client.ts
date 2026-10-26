//
// Copyright 2026 DXOS.org
//

// The storefront calls the API over HTTPS.
export const listOrders = () => fetch('https://api.shop.example/orders').then((response) => response.json());
export const checkout = (cart: unknown) =>
  fetch('https://api.shop.example/checkout', { method: 'POST', body: JSON.stringify(cart) });
