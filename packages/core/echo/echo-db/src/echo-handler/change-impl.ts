//
// Copyright 2025 DXOS.org
//

import { type Entity } from '@dxos/echo';
import { EventId, type Mutable, batchEvents } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';

import { clearPendingNotifications, enterChangeContext, hasPendingNotifications } from '../core-db/change-context';

import { getObjectCore, isEchoObject } from './echo-object-utils';
import { type ProxyTarget } from './echo-proxy-target';

/**
 * Re-export Mutable type for downstream usage.
 */
export type { Mutable };

/**
 * Internal implementation of the change function.
 * Allows mutations within a callback and batches notifications.
 *
 * @param obj - The ECHO object to mutate.
 * @param callback - The callback that performs mutations.
 */
export const changeInternal = <T extends Entity.Unknown>(obj: T, callback: (mutableObj: Mutable<T>) => void): void => {
  invariant(isEchoObject(obj), 'Object must be an ECHO object');

  const core = getObjectCore(obj);
  const target = obj as unknown as ProxyTarget;

  // Enter change context to allow mutations.
  const exitChangeContext = enterChangeContext(core);

  try {
    // Batch event notifications and execute the callback.
    // Mutations through the proxy will be allowed since we're in a change context.
    batchEvents(() => {
      callback(obj as Mutable<T>);
    });
  } finally {
    // Exit change context and restore readonly behavior.
    exitChangeContext();

    // Fire a single notification if any changes occurred during the callback.
    if (hasPendingNotifications(core)) {
      clearPendingNotifications(core);
      target[EventId]?.emit();
    }
  }
};
