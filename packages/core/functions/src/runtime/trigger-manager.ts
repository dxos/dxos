//
// Copyright 2023 DXOS.org
//

import { DeferredTask } from '@dxos/async';
import { type Client, type PublicKey } from '@dxos/client';
import type { Space } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { createSubscription } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ComplexMap } from '@dxos/util';

import { type FunctionTrigger } from '../function';

// TODO(burdon): Rename.
export type InvokeOptions = {
  endpoint: string;
  runtime: string;
};

export class TriggerManager {
  private readonly _mounts = new ComplexMap<
    { name: string; spaceKey: PublicKey },
    { ctx: Context; trigger: FunctionTrigger }
  >(({ name, spaceKey }) => `${spaceKey.toHex()}:${name}`);

  constructor(
    private readonly _client: Client,
    private readonly _triggers: FunctionTrigger[],
    private readonly _invokeOptions: InvokeOptions,
  ) {}

  async start() {
    // TODO(burdon): Make runtime configurable (via CLI)?
    this._client.spaces.subscribe(async (spaces) => {
      for (const space of spaces) {
        await space.waitUntilReady();
        for (const trigger of this._triggers) {
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
        await this.invokeFunction(this._invokeOptions, trigger.function, {
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

      ctx.onDispose(() => subscription.unsubscribe());

      // TODO(burdon): DSL for query (replace props).
      const query = space.db.query({ '@type': trigger.subscription.type, ...trigger.subscription.props });
      const unsubscribe = query.subscribe(({ objects }) => {
        subscription.update(objects);
      });

      // TODO(burdon): Option to trigger on first subscription.
      // TODO(burdon): After restart not triggered.

      ctx.onDispose(() => unsubscribe());
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

  private async invokeFunction(options: InvokeOptions, functionName: string, data: any) {
    const { endpoint, runtime } = options;
    invariant(endpoint, 'Missing endpoint');
    invariant(runtime, 'Missing runtime');

    try {
      log('invoke', { function: functionName });
      const url = `${endpoint}/${runtime}/${functionName}`;
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
