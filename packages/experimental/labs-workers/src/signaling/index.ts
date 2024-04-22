//
// Copyright 2024 DXOS.org
//

import { Hono } from 'hono';
import { upgradeWebSocket } from 'hono/cloudflare-workers';
import { type WSContext } from 'hono/ws';

import { log } from '@dxos/log';

import { type SwarmMessage } from './swarm';
import type { Env } from '../defs';

export * from './swarm';

const app = new Hono<Env>();

/**
 * Peers connect to the signaling server and exchange RTC messages with other peers.
 * Peers will stay connected to active spaces.
 * https://hono.dev/helpers/websocket
 */
// TODO(burdon): Does this support hibernation?
// TODO(burdon): Maintain single socket connection across all swarms?
app.get(
  '/ws',
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
