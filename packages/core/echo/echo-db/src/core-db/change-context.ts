//
// Copyright 2025 DXOS.org
//

import type { ObjectCore } from './object-core';

/**
 * Tracks which ObjectCore instances are currently open for mutation within an `Obj.change` context.
 * Uses WeakSet to allow garbage collection of ObjectCore instances.
 */
const changeContexts = new WeakSet<ObjectCore>();

/**
 * Deferred notifications to be fired when the change context exits.
 * Maps ObjectCore to whether it has pending notifications.
 */
const deferredNotifications = new WeakMap<ObjectCore, boolean>();

/**
 * Enter a change context for the given ObjectCore.
 * While in a change context, mutations are allowed on the object.
 *
 * @param core - The ObjectCore to enter the change context for.
 * @returns A cleanup function that exits the change context.
 */
export const enterChangeContext = (core: ObjectCore): (() => void) => {
  changeContexts.add(core);
  return () => {
    changeContexts.delete(core);
  };
};

/**
 * Check if the given ObjectCore is currently in a change context.
 *
 * @param core - The ObjectCore to check.
 * @returns True if the ObjectCore is in a change context, false otherwise.
 */
export const isInChangeContext = (core: ObjectCore): boolean => {
  return changeContexts.has(core);
};

/**
 * Queue a notification for the given ObjectCore to be fired when the change context exits.
 *
 * @param core - The ObjectCore to queue a notification for.
 */
export const queueNotification = (core: ObjectCore): void => {
  deferredNotifications.set(core, true);
};

/**
 * Check if there are any pending notifications for the given ObjectCore.
 *
 * @param core - The ObjectCore to check.
 * @returns True if there are pending notifications, false otherwise.
 */
export const hasPendingNotifications = (core: ObjectCore): boolean => {
  return deferredNotifications.get(core) === true;
};

/**
 * Clear any pending notifications for the given ObjectCore.
 *
 * @param core - The ObjectCore to clear notifications for.
 */
export const clearPendingNotifications = (core: ObjectCore): void => {
  deferredNotifications.delete(core);
};
