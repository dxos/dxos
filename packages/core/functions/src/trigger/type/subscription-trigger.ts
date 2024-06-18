//
// Copyright 2024 DXOS.org
//

import { TextV0Type } from '@braneframe/types';
import { debounce, UpdateScheduler } from '@dxos/async';
import { Filter, type Space } from '@dxos/client/echo';
import { type Context } from '@dxos/context';
import { createSubscription, getObjectCore, type Query } from '@dxos/echo-db';
import { log } from '@dxos/log';

import type { SubscriptionTrigger } from '../../types';
import { type TriggerCallback, type TriggerFactory } from '../trigger-registry';

export const createSubscriptionTrigger: TriggerFactory<SubscriptionTrigger> = async (
  ctx: Context,
  space: Space,
  spec: SubscriptionTrigger,
  callback: TriggerCallback,
) => {
  const objectIds = new Set<string>();
  const task = new UpdateScheduler(
    ctx,
    async () => {
      if (objectIds.size > 0) {
        const objects = Array.from(objectIds);
        objectIds.clear();
        await callback({ objects });
      }
    },
    { maxFrequency: 4 },
  );

  // TODO(burdon): Factor out diff.
  // TODO(burdon): Don't fire initially?
  // TODO(burdon): Create queue. Only allow one invocation per trigger at a time?
  const subscriptions: (() => void)[] = [];
  const subscription = createSubscription(({ added, updated }) => {
    const sizeBefore = objectIds.size;
    for (const object of added) {
      objectIds.add(object.id);
    }
    for (const object of updated) {
      objectIds.add(object.id);
    }
    if (objectIds.size > sizeBefore) {
      log.info('updated', { added: added.length, updated: updated.length });
      task.trigger();
    }
  });

  subscriptions.push(() => subscription.unsubscribe());

  // TODO(burdon): Disable trigger if keeps failing.
  const { filter, options: { deep, delay } = {} } = spec;
  const update = ({ objects }: Query) => {
    log.info('update', { objects: objects.length });
    subscription.update(objects);

    // TODO(burdon): Hack to monitor changes to Document's text object.
    if (deep) {
      for (const object of objects) {
        const content = object.content;
        if (content instanceof TextV0Type) {
          subscriptions.push(getObjectCore(content).updates.on(debounce(() => subscription.update([object]), 1_000)));
        }
      }
    }
  };

  // TODO(burdon): OR not working.
  // TODO(burdon): [Bug]: all callbacks are fired on the first mutation.
  // TODO(burdon): [Bug]: not updated when document is deleted (either top or hierarchically).
  log.info('subscription', { filter });
  // const query = triggerCtx.space.db.query(Filter.or(filter.map(({ type, props }) => Filter.typename(type, props))));
  if (filter) {
    const query = space.db.query(Filter.typename(filter[0].type, filter[0].props));
    subscriptions.push(query.subscribe(delay ? debounce(update, delay) : update));
  }

  ctx.onDispose(() => {
    subscriptions.forEach((unsubscribe) => unsubscribe());
  });
};
