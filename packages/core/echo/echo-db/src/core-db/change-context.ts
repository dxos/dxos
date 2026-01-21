//
// Copyright 2025 DXOS.org
//

import type { ObjectCore } from './object-core';

/**
 * Tracks the ObjectCore currently open for mutation within an `Obj.change` context.
 * Since change is synchronous and nested Obj.change calls are prohibited,
 * there can only be one object being changed at a time.
 */
let currentChangeContext: ObjectCore | null = null;

/**
 * The ObjectCore that has pending notifications, if any.
 * This is separate from currentChangeContext because notifications need to be
 * checked and cleared after the change context exits.
 */
let pendingNotificationCore: ObjectCore | null = null;

/**
 * Enter a change context for the given ObjectCore.
 * While in a change context, mutations are allowed on the object.
 *
 * @param core - The ObjectCore to enter the change context for.
 * @returns A cleanup function that exits the change context.
 */
export const enterChangeContext = (core: ObjectCore): (() => void) => {
  currentChangeContext = core;
  return () => {
    currentChangeContext = null;
  };
};

/**
 * Check if the given ObjectCore is currently in a change context.
 *
 * @param core - The ObjectCore to check.
 * @returns True if the ObjectCore is in a change context, false otherwise.
 */
export const isInChangeContext = (core: ObjectCore): boolean => {
  return currentChangeContext === core;
};

/**
 * Queue a notification for the given ObjectCore to be fired when the change context exits.
 *
 * @param core - The ObjectCore to queue a notification for.
 */
export const queueNotification = (core: ObjectCore): void => {
  if (currentChangeContext === core) {
    pendingNotificationCore = core;
  }
};

/**
 * Check if there are any pending notifications for the given ObjectCore.
 *
 * @param core - The ObjectCore to check.
 * @returns True if there are pending notifications, false otherwise.
 */
export const hasPendingNotifications = (core: ObjectCore): boolean => {
  return pendingNotificationCore === core;
};

/**
 * Clear any pending notifications for the given ObjectCore.
 *
 * @param core - The ObjectCore to clear notifications for.
 */
export const clearPendingNotifications = (core: ObjectCore): void => {
  if (pendingNotificationCore === core) {
    pendingNotificationCore = null;
  }
};
