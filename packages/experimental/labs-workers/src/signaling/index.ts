//
// Copyright 2024 DXOS.org
//

import { Hono } from 'hono';

import { log } from '@dxos/log';

import type { Env } from '../defs';

export * from './signaling-object';

const app = new Hono<Env>();

app.get('/:name', async (context) => {
  const ip = context.req.raw.headers.get('CF-Connecting-IP');
  log.info('signal', { ip });

  const { name } = context.req.param();
  const id = context.env.SIGNALING.idFromName(name);
  const stub = context.env.SIGNALING.get(id);
  const response = await stub.fetch(context.req.raw);
  const data = await response.json();
  return context.json({ id, name, data });
});

export default app;
