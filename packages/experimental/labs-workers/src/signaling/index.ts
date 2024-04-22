//
// Copyright 2024 DXOS.org
//

import { Hono } from 'hono';
import { upgradeWebSocket } from 'hono/cloudflare-workers';

import { log } from '@dxos/log';

import type { Env } from '../defs';

export * from './swarm';

//
// Peers connect to the signaling server and exchange RTC messages with other peers.
// Peers will stay connected to active spaces.
//

const app = new Hono<Env>();

/**
 * Web socket connection.
 * https://hono.dev/helpers/websocket
 */
// TODO(burdon): Does this support hibernation?
// TODO(burdon): Maintain single socket connection across all swarms?
app.get(
  '/ws',
  upgradeWebSocket((c) => {
    // const ip = c.req.raw.headers.get('CF-Connecting-IP');
    // log.info('signal', { ip });

    return {
      onMessage: (event, ws) => {
        log.info('received', { data: event.data });
        ws.send(JSON.stringify({ action: 'pong' }));
      },
      onClose: () => {
        log.info('closed');
      },
    };
  }),
);

/**
 * ```bash
 * curl -s -w '\n' http://localhost:8787/signal/join/a/1 | jq
 * ```
 */
// TODO(burdon): Change to Post.
app.get('/join/:swarmKey/:peerKey', async (c) => {
  const { swarmKey, peerKey } = c.req.param();
  const id = c.env.SIGNALING.idFromName(swarmKey);
  const stub = c.env.SIGNALING.get(id);
  const peers = await stub.join(peerKey);
  return c.json({ id, swarmKey, peers });
});

/**
 * ```bash
 * curl -s -w '\n' http://localhost:8787/signal/leave/a/1 | jq
 * ```
 */
// TODO(burdon): Change to Post.
app.get('/leave/:swarmKey/:peerKey', async (c) => {
  const { swarmKey, peerKey } = c.req.param();
  const id = c.env.SIGNALING.idFromName(swarmKey);
  const stub = c.env.SIGNALING.get(id);
  const peers = await stub.leave(peerKey);
  return c.json({ id, swarmKey, peers });
});

export default app;
