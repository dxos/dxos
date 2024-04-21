//
// Copyright 2024 DXOS.org
//

import { Hono } from 'hono';

import type { Env } from '../defs';

export * from './swarm';

const app = new Hono<Env>();

// https://developers.cloudflare.com/durable-objects/reference/in-memory-state
// const ip = context.req.raw.headers.get('CF-Connecting-IP');
// log.info('signal', { ip });

/**
 * ```bash
 * curl -s -w '\n' http://localhost:8787/signal/join/a/1 | jq
 * ```
 */
// TODO(burdon): Change to Post.
app.get('/join/:swarmKey/:peerKey', async (context) => {
  const { swarmKey, peerKey } = context.req.param();
  const id = context.env.SIGNALING.idFromName(swarmKey);
  const stub = context.env.SIGNALING.get(id);
  const peers = await stub.join(peerKey);
  return context.json({ id, swarmKey, peers });
});

/**
 * ```bash
 * curl -s -w '\n' http://localhost:8787/signal/leave/a/1 | jq
 * ```
 */
// TODO(burdon): Change to Post.
app.get('/leave/:swarmKey/:peerKey', async (context) => {
  const { swarmKey, peerKey } = context.req.param();
  const id = context.env.SIGNALING.idFromName(swarmKey);
  const stub = context.env.SIGNALING.get(id);
  const peers = await stub.leave(peerKey);
  return context.json({ id, swarmKey, peers });
});

export default app;
