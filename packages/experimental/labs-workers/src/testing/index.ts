//
// Copyright 2024 DXOS.org
//

import { Hono } from 'hono';

import { log } from '@dxos/log';

import type { Env } from '../defs';
import { postHandler } from '../exec';

const app = new Hono<Env>();

/**
 * ```bash
 * curl -s -w '\n' -X GET http://localhost:8787/testing | jq
 * ```
 */
app.post(
  '/',
  postHandler(async (input) => {
    log.info('exec', { input });
  }),
);

export default app;
