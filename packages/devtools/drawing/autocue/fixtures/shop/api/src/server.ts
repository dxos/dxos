//
// Copyright 2026 DXOS.org
//

import { Hono } from 'hono';

import { cache } from './cache.ts';
import { db } from './db.ts';
import { charge } from './payments.ts';
import { emails } from './queue.ts';

const app = new Hono();

app.get('/orders', async (c) => {
  const cached = await cache.get('orders');
  return c.json(cached ?? (await db.query('select * from orders')).rows);
});

app.post('/checkout', async (c) => {
  const cart = await c.req.json();
  const payment = await charge(cart);
  const order = await db.query('insert into orders (cart, payment) values ($1, $2) returning id', [cart, payment.id]);
  await emails.add('receipt', { orderId: order.rows[0].id });
  return c.json({ id: order.rows[0].id });
});

export default app;
