//
// Copyright 2024 DXOS.org
//

import { Hono } from 'hono';

import { chessTransform } from './chess';
import type { Env } from '../defs';
import { handlePost } from '../exec';

const app = new Hono<Env>();

/**
 * Simple chess handler.
 */
app.post('/move', handlePost(chessTransform({ level: 1, debug: true })));

export default app;
