//
// Copyright 2023 DXOS.org
//

import assert from 'node:assert';

import { DeferredTask } from '@dxos/async';
import { Client, PublicKey } from '@dxos/client';
import type { Space } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { createSubscription } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { ComplexMap } from '@dxos/util';

import { FunctionTrigger } from '../function';

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
          await this.mount(new Context(), trigger, space);
        }
      }
    });
  }

  async stop() {
    for (const { name, spaceKey } of this._mounts.keys()) {
      await this.unmount(name, spaceKey);
    }
  }

  private async mount(ctx: Context, trigger: FunctionTrigger, space: Space) {
    const key = { name: trigger.function, spaceKey: space.key };
    const exists = this._mounts.get(key);
    if (!exists) {
      this._mounts.set(key, { ctx, trigger });
      if (ctx.disposed) {
        return;
      }

      // TODO(burdon): Factor out subscription/result delta.

      let count = 0;
      const objectIds = new Set<string>();
      const task = new DeferredTask(ctx, async () => {
        const updatedObjects = Array.from(objectIds);
        objectIds.clear();

        await this.invokeFunction(this._invokeOptions, trigger.function, {
          space: space.key,
          objects: updatedObjects,
        });
      });

      const selection = createSubscription(({ added, updated }) => {
        for (const object of added) {
          objectIds.add(object.id);
        }
        for (const object of updated) {
          objectIds.add(object.id);
        }

        log('updated', {
          space: space.key,
          objects: objectIds.size,
          added: added.length,
          updated: updated.length,
          count,
        });

        // Exec if not first update.
        // if (count++) {
        task.schedule();
        count++;
        // }
      });

      ctx.onDispose(() => selection.unsubscribe());

      // TODO(burdon): DSL for query (replace props).
      const query = space.db.query({ '@type': trigger.subscription.type, ...trigger.subscription.props });
      const unsubscribe = query.subscribe(({ objects }) => {
        console.log('::::', objects);
        selection.update(objects);
      });

      // TODO(burdon): Calculate diff.
      // Trigger first update, but don't schedule task.
      // selection.update(query.objects);

      ctx.onDispose(unsubscribe);

      log('mounted', { space: space.key, trigger });
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
    assert(endpoint, 'Missing endpoint');
    assert(runtime, 'Missing runtime');

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
