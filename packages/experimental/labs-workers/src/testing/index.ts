//
// Copyright 2024 DXOS.org
//

import { Hono } from 'hono';

import type { Env } from '../defs';

const app = new Hono<Env>();

/**
 * ```bash
 * curl -s -w '\n' -X GET http://localhost:8787/testing | jq
 * ```
 */
app.get('/', (c) => {
  return c.json({ env: c.env });
});

export default app;
