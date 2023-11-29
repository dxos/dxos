//
// Copyright 2023 DXOS.org
//

import { CronJob } from 'cron';

import { debounce, DeferredTask } from '@dxos/async';
import { type Client, type PublicKey } from '@dxos/client';
import { type Space, TextObject } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { Filter, createSubscription, type Query, subscribe } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ComplexMap } from '@dxos/util';

import { type FunctionDef, type FunctionManifest, type FunctionTrigger } from '../manifest';

type SchedulerOptions = {
  endpoint: string;
};

/**
 * Functions scheduler.
 */
// TODO(burdon): Create tests.
export class Scheduler {
  // Map of mounted functions.
  private readonly _mounts = new ComplexMap<
    { id: string; spaceKey: PublicKey },
    { ctx: Context; trigger: FunctionTrigger }
  >(({ id, spaceKey }) => `${spaceKey.toHex()}:${id}`);

  constructor(
    private readonly _client: Client,
    private readonly _manifest: FunctionManifest,
    private readonly _options: SchedulerOptions,
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

    const exists = this._mounts.get(key);
    if (!exists) {
      this._mounts.set(key, { ctx, trigger });
      log('mount', { space: space.key, trigger });
      if (ctx.disposed) {
        return;
      }

      // Cron schedule.
      if (trigger.schedule) {
        const task = new DeferredTask(ctx, async () => {
          await this.execFunction(def, {
            space: space.key,
          });
        });

        // TODO(burdon): Check greater than 30s min (use cron-parser).
        const job = new CronJob(trigger.schedule, () => task.schedule());

        job.start();
        ctx.onDispose(() => job.stop());
      }

      // ECHO subscription.
      if (trigger.subscription) {
        const objectIds = new Set<string>();
        const task = new DeferredTask(ctx, async () => {
          await this.execFunction(def, {
            space: space.key,
            objects: Array.from(objectIds),
          });
        });

        // TODO(burdon): Standardize subscription handles.
        const subscriptions: (() => void)[] = [];
        const subscription = createSubscription(({ added, updated }) => {
          for (const object of added) {
            objectIds.add(object.id);
          }
          for (const object of updated) {
            objectIds.add(object.id);
          }

          task.schedule();
        });
        subscriptions.push(() => subscription.unsubscribe());

        const { type, props, deep, delay } = trigger.subscription;
        const update = ({ objects }: Query) => {
          subscription.update(objects);

          // TODO(burdon): Hack to monitor changes to Document's text object.
          if (deep) {
            log.info('update', { type, deep, objects: objects.length });
            for (const object of objects) {
              const content = object.content;
              if (content instanceof TextObject) {
                subscriptions.push(content[subscribe](debounce(() => subscription.update([object]), 1_000)));
              }
            }
          }
        };

        // TODO(burdon): [Bug]: all callbacks are fired on the first mutation.
        // TODO(burdon): [Bug]: not updated when document is deleted (either top or hierarchically).
        const query = space.db.query(Filter.typename(type, props));
        subscriptions.push(query.subscribe(delay ? debounce(update, delay * 1_000) : update));

        ctx.onDispose(() => {
          subscriptions.forEach((unsubscribe) => unsubscribe());
        });
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

  private async execFunction(def: FunctionDef, data: any) {
    try {
      log('request', { function: def.id });
      const response = await fetch(`${this._options.endpoint}/${def.name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      // const result = await response.json();
      log('result', { function: def.id, result: response.status });
    } catch (err: any) {
      log.error('error', { function: def.id, error: err.message });
    }
  }
}
