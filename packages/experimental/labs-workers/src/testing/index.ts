//
// Copyright 2024 DXOS.org
//

import { Hono } from 'hono';

import { log } from '@dxos/log';

import type { Env } from '../defs';

const app = new Hono<Env>();

app.get('/', (c) => {
  log.info('test', { env: c.env });
  return c.json({ env: c.env });
});

export default app;
