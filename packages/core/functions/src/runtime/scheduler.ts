//
// Copyright 2023 DXOS.org
//

import { CronJob } from 'cron';
import http from 'node:http';
import WebSocket from 'ws';

import { TextV0Type } from '@braneframe/types';
import { debounce, DeferredTask, sleep, Trigger } from '@dxos/async';
import { type Client, type PublicKey } from '@dxos/client';
import { createSubscription, Filter, getAutomergeObjectCore, type Query, type Space } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ComplexMap } from '@dxos/util';

import { type FunctionSubscriptionEvent } from '../handler';
import {
  type FunctionDef,
  type FunctionManifest,
  type FunctionTrigger,
  type SubscriptionTrigger,
  type TimerTrigger,
  type WebhookTrigger,
  type WebsocketTrigger,
} from '../types';

type Callback = (data: FunctionSubscriptionEvent) => Promise<void>;

export type SchedulerOptions = {
  endpoint?: string;
  callback?: Callback;
};

/**
 * The scheduler triggers function exectuion based on various triggers.
 */
export class Scheduler {
  // Map of mounted functions.
  private readonly _mounts = new ComplexMap<
    { id: string; spaceKey: PublicKey },
    { ctx: Context; trigger: FunctionTrigger }
  >(({ id, spaceKey }) => `${spaceKey.toHex()}:${id}`);

  constructor(
    private readonly _client: Client,
    private readonly _manifest: FunctionManifest,
    private readonly _options: SchedulerOptions = {},
  ) {}

  async start() {
    this._client.spaces.subscribe(async (spaces) => {
      for (const space of spaces) {
        await space.waitUntilReady();
        for (const trigger of this._manifest.triggers ?? []) {
          await this.mount(new Context(), space, trigger);
        }
      }
    });
  }

  async stop() {
    for (const { id, spaceKey } of this._mounts.keys()) {
      await this.unmount(id, spaceKey);
    }
  }

  private async mount(ctx: Context, space: Space, trigger: FunctionTrigger) {
    const key = { id: trigger.function, spaceKey: space.key };
    const def = this._manifest.functions.find((config) => config.id === trigger.function);
    invariant(def, `Function not found: ${trigger.function}`);

    // TODO(burdon): Currently supports only one trigger declaration per function.
    const exists = this._mounts.get(key);
    if (!exists) {
      this._mounts.set(key, { ctx, trigger });
      log('mount', { space: space.key, trigger });
      if (ctx.disposed) {
        return;
      }

      //
      // Triggers types.
      //

      if (trigger.timer) {
        await this._createTimer(ctx, space, def, trigger.timer);
      }

      if (trigger.webhook) {
        await this._createWebhook(ctx, space, def, trigger.webhook);
      }

      if (trigger.websocket) {
        await this._createWebsocket(ctx, space, def, trigger.websocket);
      }

      if (trigger.subscription) {
        await this._createSubscription(ctx, space, def, trigger.subscription);
      }
    }
  }

  private async unmount(id: string, spaceKey: PublicKey) {
    const key = { id, spaceKey };
    const { ctx } = this._mounts.get(key) ?? {};
    if (ctx) {
      this._mounts.delete(key);
      await ctx.dispose();
    }
  }

  // TODO(burdon): Pass in Space key (common context).
  private async _execFunction(def: FunctionDef, data: any) {
    try {
      log.info('exec', { function: def.id });
      const { endpoint, callback } = this._options;
      if (endpoint) {
        // TODO(burdon): Move out of scheduler (generalize as callback).
        await fetch(`${this._options.endpoint}/${def.name}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
      } else if (callback) {
        await callback(data);
      }

      // const result = await response.json();
      log.info('done', { function: def.id });
    } catch (err: any) {
      log.error('error', { function: def.id, error: err.message });
    }
  }

  //
  // Triggers
  //

  /**
   * Cron timer.
   */
  private async _createTimer(ctx: Context, space: Space, def: FunctionDef, trigger: TimerTrigger) {
    log.info('timer', { space: space.key, trigger });
    const { cron } = trigger;

    const task = new DeferredTask(ctx, async () => {
      await this._execFunction(def, { space: space.key });
    });

    let last = 0;
    let run = 0;
    // https://www.npmjs.com/package/cron#constructor
    const job = CronJob.from({
      cronTime: cron,
      runOnInit: false,
      onTick: () => {
        // TODO(burdon): Check greater than 30s (use cron-parser).
        const now = Date.now();
        const delta = last ? now - last : 0;
        last = now;

        run++;
        log.info('tick', { space: space.key.truncate(), count: run, delta });
        task.schedule();
      },
    });

    job.start();
    ctx.onDispose(() => job.stop());
  }

  /**
   * Webhook.
   */
  private async _createWebhook(ctx: Context, space: Space, def: FunctionDef, trigger: WebhookTrigger) {
    log.info('webhook', { space: space.key, trigger });
    const { port } = trigger;

    // TODO(burdon): POST JSON.
    const server = http.createServer(async (req, res) => {
      await this._execFunction(def, { space: space.key });
    });

    server.listen(port, () => {
      log.info('started webhook', { port });
    });

    ctx.onDispose(() => {
      server.close();
    });
  }

  /**
   * Websocket.
   */
  private async _createWebsocket(
    ctx: Context,
    space: Space,
    def: FunctionDef,
    trigger: WebsocketTrigger,
    options: {
      retryDelay: number;
      maxAttempts: number;
    } = {
      retryDelay: 2,
      maxAttempts: 5,
    },
  ) {
    log.info('websocket', { space: space.key, trigger });
    const { url } = trigger;

    let ws: WebSocket;
    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
      const open = new Trigger<boolean>();

      ws = new WebSocket(url);
      Object.assign(ws, {
        onopen: () => {
          log.info('opened', { url });
          if (trigger.init) {
            ws.send(new TextEncoder().encode(JSON.stringify(trigger.init)));
          }

          open.wake(true);
        },

        onclose: () => {
          log.info('closed', { url });
          open.wake(false);
        },

        onerror: (event) => {
          log.catch(event.error, { url });
        },

        onmessage: async (event) => {
          try {
            const data = JSON.parse(new TextDecoder().decode(event.data as Uint8Array));
            await this._execFunction(def, { space: space.key, data });
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
  }

  /**
   * ECHO subscription.
   */
  private async _createSubscription(ctx: Context, space: Space, def: FunctionDef, trigger: SubscriptionTrigger) {
    log.info('subscription', { space: space.key, trigger });
    const objectIds = new Set<string>();
    const task = new DeferredTask(ctx, async () => {
      await this._execFunction(def, { space: space.key, objects: Array.from(objectIds) });
    });

    // TODO(burdon): Don't fire initially.
    // TODO(burdon): Subscription is called THREE times.
    const subscriptions: (() => void)[] = [];
    const subscription = createSubscription(({ added, updated }) => {
      log.info('updated', { added: added.length, updated: updated.length });
      for (const object of added) {
        objectIds.add(object.id);
      }
      for (const object of updated) {
        objectIds.add(object.id);
      }

      task.schedule();
    });
    subscriptions.push(() => subscription.unsubscribe());

    // TODO(burdon): Create queue. Only allow one invocation per trigger at a time?
    // TODO(burdon): Disable trigger if keeps failing.
    const { filter, options: { deep, delay } = {} } = trigger;
    const update = ({ objects }: Query) => {
      subscription.update(objects);

      // TODO(burdon): Hack to monitor changes to Document's text object.
      if (deep) {
        log.info('update', { objects: objects.length });
        for (const object of objects) {
          const content = object.content;
          if (content instanceof TextV0Type) {
            subscriptions.push(
              getAutomergeObjectCore(content).updates.on(debounce(() => subscription.update([object]), 1_000)),
            );
          }
        }
      }
    };

    // TODO(burdon): Is Filter.or implemented?
    // TODO(burdon): [Bug]: all callbacks are fired on the first mutation.
    // TODO(burdon): [Bug]: not updated when document is deleted (either top or hierarchically).
    const query = space.db.query(Filter.or(filter.map(({ type, props }) => Filter.typename(type, props))));
    subscriptions.push(query.subscribe(delay ? debounce(update, delay) : update));

    ctx.onDispose(() => {
      subscriptions.forEach((unsubscribe) => unsubscribe());
    });
  }
}
