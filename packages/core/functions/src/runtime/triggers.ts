//
// Copyright 2023 DXOS.org
//

import assert from 'node:assert';

import { DeferredTask } from '@dxos/async';
import { Client } from '@dxos/client';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { createSubscription } from '@dxos/observable-object';

import { FunctionTrigger } from '../function';

export type InvokeOptions = {
  endpoint: string;
  runtime: string;
};

export type MountTriggerParams = {
  ctx: Context;
  client: Client;
  trigger: FunctionTrigger;
  invokeOptions: InvokeOptions;
};

// TODO(burdon): Function?
export const mountTrigger = async ({ ctx, client, trigger, invokeOptions }: MountTriggerParams) => {
  assert(trigger.subscription.spaceKey, 'Missing spaceKey');

  // TODO(burdon): Create trigger for each space.
  const space = client.spaces.get().find((space) => space.key.equals(trigger.subscription.spaceKey));
  if (!space) {
    log.warn('space not found', { space: trigger.subscription.spaceKey });
    return;
  }

  await space.waitUntilReady();
  if (ctx.disposed) {
    return;
  }

  const updatedIds = new Set<string>();
  const task = new DeferredTask(ctx, async () => {
    const updatedObjects = Array.from(updatedIds);
    updatedIds.clear();

    await invoke(invokeOptions, trigger.function, {
      space: trigger.subscription.spaceKey,
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

  console.log({ props: trigger.subscription.props });
  const query = space.db.query({
    ...trigger.subscription.props,
    '@type': trigger.subscription.type,
  });

  // TODO(burdon): Trigger on subscription.
  const unsubscribe = query.subscribe(({ objects }) => {
    selection.update(objects);
  });
  selection.update(query.objects);
  ctx.onDispose(unsubscribe);

  log('mounted trigger', { trigger });
};

const invoke = async (options: InvokeOptions, functionName: string, data: any) => {
  const { endpoint, runtime } = options;
  assert(endpoint, 'Missing endpoint');
  assert(runtime, 'Missing runtime');

  const url = `${endpoint}/${runtime}/${functionName}`;
  log.info('invoke', { functionName });

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    log.info('invoke result', { functionName, result: await res.text() });
  } catch (err: any) {
    log.info('invoke error', { functionName, error: err.message });
  }
};
