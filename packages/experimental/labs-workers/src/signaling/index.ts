//
// Copyright 2024 DXOS.org
//

import { Hono } from 'hono';

import { log } from '@dxos/log';

import type { Env } from '../defs';

export * from './protocol';
export * from './socket';
export * from './swarm';

const app = new Hono<Env>();

// TODO(burdon): https://github.com/partykit/partykit/blob/main/packages/partykit/src/server.ts

/**
 * Peers connect to the signaling server and exchange RTC messages with other peers.
 * Peers will stay connected to active spaces.
 * https://hono.dev/helpers/websocket
 */
app.get('/ws', async (c) => {
  log.info('open');
  const upgradeHeader = c.req.raw.headers.get('Upgrade');
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return new Response('Durable Object expected Upgrade: websocket', { status: 426 });
  }

  // TODO(burdon): PRIVACY.
  const { postalCode, latitude, longitude } = (c.req.raw as any).cf as IncomingRequestCfProperties;
  log.info('metadata', { postalCode, latitude, longitude });

  // All sockets are handled by the same Durable Object.
  const id = c.env.WEBSOCKET.idFromName('WEBSOCKET');
  const stub = c.env.WEBSOCKET.get(id);
  const f = await stub.fetch(c.req.raw);
  return new Response(null, {
    status: f.status,
    // @ts-ignore
    webSocket: f.webSocket,
  });
});

export default app;
