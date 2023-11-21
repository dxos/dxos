//
// Copyright 2023 DXOS.org
//

import { CronJob } from 'cron';

import { DeferredTask } from '@dxos/async';
import { type Client, type PublicKey } from '@dxos/client';
import type { Query, Space } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { Filter, createSubscription } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ComplexMap } from '@dxos/util';

import { type FunctionDef, type FunctionManifest, type FunctionTrigger } from '../manifest';

type SchedulerOptions = {
  endpoint: string;
};

/**
 * Function scheduler.
 */
// TODO(burdon): Create tests.
export class Scheduler {
  // Map of mounted functions.
  private readonly _mounts = new ComplexMap<
    { id: string; spaceKey: PublicKey },
    { ctx: Context; trigger: FunctionTrigger }
  >(({ id, spaceKey }) => `${spaceKey.toHex()}:${id}`);

  private readonly _queries = new Set<Query>();

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

        let count = 0;
        const subscription = createSubscription(({ added, updated }) => {
          for (const object of added) {
            objectIds.add(object.id);
          }
          for (const object of updated) {
            objectIds.add(object.id);
          }

          log('updated', {
            trigger,
            space: space.key,
            objects: objectIds.size,
            count,
          });

          task.schedule();
          count++;
        });

        const { type, props } = trigger.subscription;
        const query = space.db.query(Filter.typename(type, props));
        this._queries.add(query);

        const unsubscribe = query.subscribe(({ objects }) => {
          subscription.update(objects);
        }, true);

        ctx.onDispose(() => {
          subscription.unsubscribe();
          unsubscribe();
          this._queries.delete(query);
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
    const { endpoint } = this._options;
    invariant(endpoint, 'Missing endpoint');

    try {
      log('invoke', { function: def.id });
      const url = `${endpoint}/${def.path}`;
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await res.json();
      log('result', { function: def.id, result });
    } catch (err: any) {
      log.error('error', { function: def.id, error: err.message });
    }
  }
}
