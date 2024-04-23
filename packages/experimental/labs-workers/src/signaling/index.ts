//
// Copyright 2024 DXOS.org
//

import { Hono } from 'hono';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import type { Env } from '../defs';

export * from './protocol';
export * from './socket';

const app = new Hono<Env>();

/**
 * Peers connect to the signaling server to discover other peers and exchange RTC messages.
 * Peers maintain separate Web socket connections to swarms during peer discovery.
 *
 * https://hono.dev/helpers/websocket
 * Ref: https://github.com/partykit/partykit/blob/main/packages/partykit/src/server.ts
 */
app.get('/ws/:swarmKey', async (c) => {
  const swarmKey = PublicKey.from(c.req.param('swarmKey'));
  log.info('open', { swarmKey: swarmKey.truncate() }); // TODO(burdon): Configure logger.
  const upgradeHeader = c.req.raw.headers.get('Upgrade');
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return new Response('Durable Object expected Upgrade: websocket', { status: 426 });
  }

  // TODO(burdon): PRIVACY.
  const { postalCode, latitude, longitude } = (c.req.raw as any).cf as IncomingRequestCfProperties;
  log.info('metadata', { postalCode, latitude, longitude });

  // Route the WebSocket connection to the Durable Object associated with the swarm.
  // The Hibernation API limits to 32k connections per durable object (with 10 tags per socket).
  // https://developers.cloudflare.com/durable-objects/api/websockets/#acceptwebsocket
  const id = c.env.SIGNALING.idFromName(swarmKey.toHex());
  const stub = c.env.SIGNALING.get(id);
  const response = await stub.fetch(c.req.raw);

  return new Response(null, {
    status: response.status,
    // @ts-ignore
    // TODO(burdon): CF extended types.
    webSocket: response.webSocket,
  });
});

export default app;
