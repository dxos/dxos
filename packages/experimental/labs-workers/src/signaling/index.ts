//
// Copyright 2024 DXOS.org
//

import { Hono } from 'hono';
import { upgradeWebSocket } from 'hono/cloudflare-workers';
import { type WSContext } from 'hono/ws';

import { log } from '@dxos/log';

import { type SwarmMessage } from './swarm';
import type { Env } from '../defs';

export * from './socket';
export * from './swarm';

const app = new Hono<Env>();

// TODO(burdon): https://github.com/partykit/partykit/blob/main/packages/partykit/src/server.ts

/**
 * Peers connect to the signaling server and exchange RTC messages with other peers.
 * Peers will stay connected to active spaces.
 * https://hono.dev/helpers/websocket
 */
// TODO(burdon): Does this support hibernation?
// TODO(burdon): Maintain single socket connection across all swarms?
app.get('/ws', (c) => {
  log.info('open');
  const upgradeHeader = c.req.raw.headers.get('Upgrade');
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return new Response('Durable Object expected Upgrade: websocket', { status: 426 });
  }

  // TODO(burdon): Test with just fetch (not hono).

  // TODO(burdon): Create durable object for room.
  const id = c.env.WEBSOCKET.idFromName('sockets');
  const stub = c.env.WEBSOCKET.get(id);
  return stub.fetch(c.req.raw);
});

// npx ts-node ./src/client/client.ts
app.get(
  '/ws2',
  upgradeWebSocket((c) => {
    log.info('open');

    // const ip = c.req.raw.headers.get('CF-Connecting-IP');
    // log.info('signal', { ip });

    let onClose: () => Promise<void>;

    // NOTE: onOpen not called.
    return {
      onClose: async () => {
        await onClose?.();
      },

      onError: (event) => {
        log.catch(event);
      },

      // TODO(burdon): Broadcast to other peers.
      onMessage: async (event, ws: WSContext) => {
        const data: SwarmMessage = JSON.parse(event.data.toString());
        log.info('received', { data });
        const { peerKey, swarmKey } = data;
        const stub = c.env.SIGNALING.get(c.env.SIGNALING.idFromName(swarmKey));

        // https://developers.cloudflare.com/durable-objects/api/websockets/#state-methods
        // acceptWebSocket(ws);

        onClose = async () => {
          log.info('closed', { peerKey });
          await stub.leave(peerKey);
        };

        // Route message.
        const peerKeys = await stub.join(peerKey);
        peerKeys.forEach((peerKey: string) => {
          // console.log(peerKey);
          // if (ws) {
          //   ws.send(JSON.stringify(data));
          // }
        });
      },
    };
  }),
);

export default app;
