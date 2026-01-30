//
// Copyright 2025 DXOS.org
//

import { batchEvents } from './event-batch';
import { EventId } from './symbols';

/**
 * Generic change context tracking.
 * Only one object can be in a change context at a time (synchronous changes).
 *
 * This module provides a unified change context mechanism used by both:
 * - TypedReactiveHandler (for non-database objects, using target as key)
 * - EchoReactiveHandler (for database objects, using ObjectCore as key)
 */

/**
 * The object currently in a change context.
 * Can be a target object (for typed reactive) or ObjectCore (for database objects).
 */
let currentChangeContext: object | null = null;

/**
 * Tracks re-entry depth into the same object's change context.
 */
let changeContextDepth = 0;

/**
 * The primary object that has pending notifications, if any.
 * This uses the contextKey (target or ObjectCore).
 */
let pendingNotificationKey: object | null = null;

/**
 * Additional objects (owner chain) that need notifications.
 * These are separate from the primary notification because they use EventId directly.
 */
const pendingOwnerNotifications = new Set<object>();

/**
 * Enter a change context for the given key.
 * While in a change context, mutations are allowed on the associated object.
 *
 * @param key - The key to enter the change context for (target object or ObjectCore).
 * @returns A cleanup function that exits the change context.
 */
export const enterChangeContext = (key: object): (() => void) => {
  if (currentChangeContext === null) {
    currentChangeContext = key;
  }
  changeContextDepth++;
  return () => {
    changeContextDepth--;
    if (changeContextDepth === 0) {
      currentChangeContext = null;
    }
  };
};

/**
 * Check if the given key is currently in a change context.
 *
 * @param key - The key to check (target object or ObjectCore).
 * @returns True if the key is in a change context, false otherwise.
 */
export const isInChangeContext = (key: object): boolean => {
  return currentChangeContext === key;
};

/**
 * Queue a notification for the given key to be fired when the change context exits.
 *
 * @param key - The key to queue a notification for.
 */
export const queueNotification = (key: object): void => {
  if (currentChangeContext === key) {
    pendingNotificationKey = key;
  }
};

/**
 * Queue an owner notification. Owner notifications are for objects in the ownership
 * chain that should be notified when a nested object changes.
 * These objects have EventId and emit directly.
 * Skip if the target is already the current change context (to avoid duplicate notifications).
 *
 * @param target - The owner target that has EventId.
 */
export const queueOwnerNotification = (target: object): void => {
  // Skip if this is the object already being changed (primary notification handles it).
  if (currentChangeContext !== null && target !== currentChangeContext) {
    pendingOwnerNotifications.add(target);
  }
};

/**
 * Check if there are any pending notifications for the given key.
 *
 * @param key - The key to check.
 * @returns True if there are pending notifications, false otherwise.
 */
export const hasPendingNotifications = (key: object): boolean => {
  return pendingNotificationKey === key;
};

/**
 * Clear any pending notifications for the given key.
 *
 * @param key - The key to clear notifications for.
 */
export const clearPendingNotifications = (key: object): void => {
  if (pendingNotificationKey === key) {
    pendingNotificationKey = null;
  }
};

/**
 * Execute a callback within a change context.
 * This is the shared implementation used by both TypedReactiveHandler and EchoReactiveHandler.
 *
 * @param contextKey - The key for the change context (target for typed, ObjectCore for db).
 * @param eventTarget - The object that has the EventId for notifications.
 * @param proxy - The proxy object to pass to the callback.
 * @param callback - The callback to execute with mutations allowed.
 */
export const executeChange = (
  contextKey: object,
  eventTarget: object,
  proxy: any,
  callback: (proxy: any) => void,
): void => {
  const exitContext = enterChangeContext(contextKey);
  try {
    batchEvents(() => callback(proxy));
  } finally {
    exitContext();
    // Fire primary notification.
    if (hasPendingNotifications(contextKey)) {
      clearPendingNotifications(contextKey);
      (eventTarget as any)[EventId]?.emit();
    }
    // Fire owner chain notifications.
    for (const ownerTarget of pendingOwnerNotifications) {
      (ownerTarget as any)[EventId]?.emit();
    }
    pendingOwnerNotifications.clear();
  }
};
