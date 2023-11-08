//
// Copyright 2023 DXOS.org
//

import { DeferredTask } from '@dxos/async';
import { type Client, type PublicKey } from '@dxos/client';
import type { Query, Space } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { Filter, createSubscription } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ComplexMap } from '@dxos/util';

import { type FunctionManifest, type FunctionTrigger } from '../manifest';

// TODO(burdon): Rename.
export type InvokeOptions = {
  endpoint: string;
};

export class TriggerManager {
  private readonly _mounts = new ComplexMap<
    { name: string; spaceKey: PublicKey },
    { ctx: Context; trigger: FunctionTrigger }
  >(({ name, spaceKey }) => `${spaceKey.toHex()}:${name}`);

  private readonly _queries = new Set<Query>();

  constructor(
    private readonly _client: Client,
    private readonly _manifest: FunctionManifest,
    private readonly _invokeOptions: InvokeOptions,
  ) {}

  async start() {
    // TODO(burdon): Make runtime configurable (via CLI)?
    this._client.spaces.subscribe(async (spaces) => {
      for (const space of spaces) {
        await space.waitUntilReady();
        for (const trigger of this._manifest.triggers ?? []) {
          // TODO(burdon): New context? Shared?
          await this.mount(new Context(), space, trigger);
        }
      }
    });
  }

  async stop() {
    for (const { name, spaceKey } of this._mounts.keys()) {
      await this.unmount(name, spaceKey);
    }
  }

  private async mount(ctx: Context, space: Space, trigger: FunctionTrigger) {
    const key = { name: trigger.function, spaceKey: space.key };
    const config = this._manifest.functions.find((config) => config.id === trigger.function);
    invariant(config, `Function not found: ${trigger.function}`);
    const exists = this._mounts.get(key);
    if (!exists) {
      this._mounts.set(key, { ctx, trigger });
      log('mount', { space: space.key, trigger });
      if (ctx.disposed) {
        return;
      }

      // TODO(burdon): Why DeferredTask? How to pass objectIds to function?
      const objectIds = new Set<string>();
      const task = new DeferredTask(ctx, async () => {
        await this.execFunction(this._invokeOptions, config.path, {
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
      // TODO(burdon): DSL for query (replace props).
      const query = space.db.query(Filter._typename(trigger.subscription.type));
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

  private async unmount(name: string, spaceKey: PublicKey) {
    const key = { name, spaceKey };
    const { ctx } = this._mounts.get(key) ?? {};
    if (ctx) {
      this._mounts.delete(key);
      await ctx.dispose();
    }
  }

  private async execFunction(options: InvokeOptions, functionName: string, data: any) {
    const { endpoint } = options;
    invariant(endpoint, 'Missing endpoint');

    try {
      log('invoke', { function: functionName });
      const url = `${endpoint}/${functionName}`;
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      log('result', { function: functionName, result: await res.json() });
    } catch (err: any) {
      log.error('error', { function: functionName, error: err.message });
    }
  }
}
