//
// Copyright 2025 DXOS.org
//

import { type Entity, type Obj } from '@dxos/echo';
import { EventId, batchEvents } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';

import { clearPendingNotifications, enterChangeContext, hasPendingNotifications } from '../core-db/change-context';

import { getObjectCore, isEchoObject } from './echo-object-utils';
import { type ProxyTarget } from './echo-proxy-target';

/**
 * Makes all properties mutable recursively.
 * Used to provide a mutable view of an object within `Obj.change`.
 */
export type Mutable<T> = T extends Obj.Any
  ? {
      -readonly [P in keyof T]: T[P] extends object ? Mutable<T[P]> : T[P];
    }
  : {
      -readonly [P in keyof T]: T[P] extends object ? Mutable<T[P]> : T[P];
    };

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
