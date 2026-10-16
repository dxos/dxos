//
// Copyright 2026 DXOS.org
//

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_KEY ?? '');

export const charge = (cart: { total: number }) =>
  stripe.paymentIntents.create({ amount: cart.total, currency: 'usd' });
