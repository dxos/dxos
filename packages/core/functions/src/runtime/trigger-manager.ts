//
// Copyright 2023 DXOS.org
//

import assert from 'node:assert';

import { DeferredTask } from '@dxos/async';
import { Client, PublicKey, Space } from '@dxos/client';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { createSubscription } from '@dxos/observable-object';
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

      const updatedIds = new Set<string>();
      const task = new DeferredTask(ctx, async () => {
        const updatedObjects = Array.from(updatedIds);
        updatedIds.clear();

        await this.invokeFunction(this._invokeOptions, trigger.function, {
          space: space.key,
          objects: updatedObjects,
        });
      });

      const selection = createSubscription(({ added, updated }) => {
        for (const object of added) {
          updatedIds.add(object.id);
        }
        for (const object of updated) {
          updatedIds.add(object.id);
        }

        task.schedule();
      });

      ctx.onDispose(() => selection.unsubscribe());

      const query = space.db.query({ ...trigger.subscription.props, '@type': trigger.subscription.type });
      const unsubscribe = query.subscribe(({ objects }) => {
        selection.update(objects);
      });

      // TODO(burdon): Subscribe method option to trigger automatically (throughout codebase).
      selection.update(query.objects);

      ctx.onDispose(unsubscribe);

      log('mounted', { trigger });
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
      log.info('invoke', { function: functionName });
      const url = `${endpoint}/${runtime}/${functionName}`;
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      log.info('result', { function: functionName, result: await res.json() });
    } catch (err: any) {
      log.info('error', { function: functionName, error: err.message });
    }
  }
}

export type MountTriggerParams = {
  ctx: Context;
  client: Client;
  trigger: FunctionTrigger;
  invokeOptions: InvokeOptions;
};
