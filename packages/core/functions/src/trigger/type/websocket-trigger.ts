//
// Copyright 2024 DXOS.org
//

import WebSocket from 'ws';

import { sleep, Trigger } from '@dxos/async';
import { type Context } from '@dxos/context';
import { log } from '@dxos/log';

import { type WebsocketTrigger } from '../../types';
import { type TriggerCallback, type TriggerContext, type TriggerFactory } from '../trigger-registry';

interface WebsocketTriggerOptions {
  retryDelay: number;
  maxAttempts: number;
}

/**
 * Websocket.
 * NOTE: The port must be unique, so the same hook cannot be used for multiple spaces.
 */
export const createWebsocketTrigger: TriggerFactory<WebsocketTrigger, WebsocketTriggerOptions> = async (
  ctx: Context,
  triggerCtx: TriggerContext,
  spec: WebsocketTrigger,
  callback: TriggerCallback,
  options: WebsocketTriggerOptions = { retryDelay: 2, maxAttempts: 5 },
) => {
  const { url, init } = spec;

  let ws: WebSocket;
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    const open = new Trigger<boolean>();

    ws = new WebSocket(url);
    Object.assign(ws, {
      onopen: () => {
        log.info('opened', { url });
        if (spec.init) {
          ws.send(new TextEncoder().encode(JSON.stringify(init)));
        }

        open.wake(true);
      },

      onclose: (event) => {
        log.info('closed', { url, code: event.code });
        // Reconnect if server closes (e.g., CF restart).
        // https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
        if (event.code === 1006) {
          setTimeout(async () => {
            log.info(`reconnecting in ${options.retryDelay}s...`, { url });
            await createWebsocketTrigger(ctx, triggerCtx, spec, callback, options);
          }, options.retryDelay * 1_000);
        }

        open.wake(false);
      },

      onerror: (event) => {
        log.catch(event.error, { url });
      },

      onmessage: async (event) => {
        try {
          log.info('message');
          const data = JSON.parse(new TextDecoder().decode(event.data as Uint8Array));
          await callback({ data });
        } catch (err) {
          log.catch(err, { url });
        }
      },
    } satisfies Partial<WebSocket>);

    const isOpen = await open.wait();
    if (isOpen) {
      break;
    } else {
      const wait = Math.pow(attempt, 2) * options.retryDelay;
      if (attempt < options.maxAttempts) {
        log.warn(`failed to connect; trying again in ${wait}s`, { attempt });
        await sleep(wait * 1_000);
      }
    }
  }

  ctx.onDispose(() => {
    ws?.close();
  });
};
