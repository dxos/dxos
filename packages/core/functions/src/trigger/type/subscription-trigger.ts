//
// Copyright 2024 DXOS.org
//

import { TextV0Type } from '@braneframe/types';
import { debounce, DeferredTask } from '@dxos/async';
import { type Context } from '@dxos/context';
import { createSubscription, Filter, getAutomergeObjectCore, type Query } from '@dxos/echo-db';
import { log } from '@dxos/log';

import type { SubscriptionTrigger } from '../../types';
import { type TriggerCallback, type TriggerContext, type TriggerFactory } from '../trigger-registry';

export const createSubscriptionTrigger: TriggerFactory<SubscriptionTrigger> = async (
  ctx: Context,
  triggerCtx: TriggerContext,
  spec: SubscriptionTrigger,
  callback: TriggerCallback,
) => {
  const objectIds = new Set<string>();
  const task = new DeferredTask(ctx, async () => {
    if (objectIds.size > 0) {
      await callback({ objects: Array.from(objectIds) });
      objectIds.clear();
    }
  });

  // TODO(burdon): Don't fire initially?
  // TODO(burdon): Create queue. Only allow one invocation per trigger at a time?
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

  // TODO(burdon): Disable trigger if keeps failing.
  const { filter, options: { deep, delay } = {} } = spec;
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
  const query = triggerCtx.space.db.query(Filter.or(filter.map(({ type, props }) => Filter.typename(type, props))));
  subscriptions.push(query.subscribe(delay ? debounce(update, delay) : update));

  ctx.onDispose(() => {
    subscriptions.forEach((unsubscribe) => unsubscribe());
  });
};
