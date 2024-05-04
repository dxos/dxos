//
// Copyright 2024 DXOS.org
//

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { timing } from 'hono/timing';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type Env } from './defs';

/**
 * https://hono.dev/top
 * https://hono.dev/getting-started/cloudflare-workers
 * https://developers.cloudflare.com/workers/runtime-apis/request
 */
export const app = new Hono<{ Bindings: Env }>().basePath('/signaling');

// TODO(burdon): Integrate baselime.
app.use(
  logger((msg, ...params) => {
    log.info(msg, params.length ? { params } : undefined);
  }),
);
app.use(
  timing({
    enabled: () => true,
  }),
);

/**
 * Error handling.
 * https://hono.dev/api/exception#handling-httpexception
 */
app.onError((err, c) => {
  const response = err instanceof HTTPException ? err.getResponse() : new Response('Request failed', { status: 500 });
  if (response.status === 401) {
    return c.redirect('/signup');
  } else if (response.status < 500) {
    log.info('invalid request', { status: response.status, statusCode: response.statusText, err: err.message });
  } else {
    log.error('request failed', { err });
  }

  return response;
});

/**
 * Peers connect to the signaling server to discover other peers and exchange RTC messages.
 * Peers maintain separate Web socket connections to swarms during peer discovery.
 *
 * https://hono.dev/helpers/websocket
 * Ref: https://github.com/partykit/partykit/blob/main/packages/partykit/src/server.ts
 */
app.get('/ws/:identityKey/:deviceKey', async (c) => {
  const identityKey = PublicKey.from(c.req.param('identityKey'));
  log.info('open', { swarmKey: identityKey.truncate() }); // TODO(burdon): Configure logger.
  const upgradeHeader = c.req.raw.headers.get('Upgrade');
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return new Response('Expected header: [Upgrade=websocket]', { status: 426 });
  }

  // TODO(burdon): Privacy: only use for beta/testing.
  const { postalCode, latitude, longitude } = (c.req.raw as any).cf as IncomingRequestCfProperties;
  log.info('metadata', { postalCode, latitude, longitude });

  // Route the WebSocket connection to the Durable Object associated with the identity swarm.
  // The Hibernation API limits to 32k connections per durable object (with 10 tags per socket).
  // https://developers.cloudflare.com/durable-objects/api/websockets/#acceptwebsocket
  // https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-from-a-worker/#derive-ids-from-names
  const id = c.env.USER.idFromName(identityKey.toHex());
  const user = c.env.USER.get(id);
  const response = await user.fetch(c.req.raw);

  return new Response(null, {
    status: response.status,
    // @ts-ignore
    // TODO(burdon): CF extended types. See Discord issue in @dxos/w3.
    webSocket: response.webSocket,
  });
});
