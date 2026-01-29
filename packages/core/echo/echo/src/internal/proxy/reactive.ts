//
// Copyright 2025 DXOS.org
//

import { getProxyTarget, isProxy } from './proxy-utils';
import { ChangeId, EventId } from './symbols';

/**
 * Subscribe to changes on a reactive object.
 * @param obj - The reactive object to subscribe to.
 * @param callback - Called when the object changes.
 * @returns Unsubscribe function.
 */
// TODO(wittjosiah): Consider throwing if obj doesn't have EventId instead of returning no-op.
export const subscribe = (obj: unknown, callback: () => void): (() => void) => {
  const target = getProxyTarget(obj as any);
  if (target && EventId in target) {
    return (target as any)[EventId].on(callback);
  }
  return () => {};
};

/**
 * Removes readonly modifiers from top-level properties of T.
 * Also converts readonly arrays at the top level to mutable arrays.
 * For nested properties, mutability depends on the schema definition.
 */
export type Mutable<T> = T extends object
  ? { -readonly [K in keyof T]: T[K] extends readonly (infer U)[] ? U[] : T[K] }
  : T;

/**
 * Callback type for the change function.
 */
export type ChangeCallback<T> = (mutableObj: Mutable<T>) => void;

/**
 * Perform mutations on a reactive object within a change context.
 *
 * If the object has a change handler (via ChangeId), it will be called with the callback.
 * This allows handlers to implement features like:
 * - Readonly enforcement (mutations only allowed within change context)
 * - Batched notifications (single notification for all mutations in the callback)
 * - Transaction semantics
 *
 * If the object doesn't have a change handler, the callback is called directly.
 *
 * @param obj - The reactive object to mutate.
 * @param callback - Callback that receives a mutable view of the object.
 */
export const change = <T>(obj: T, callback: ChangeCallback<T>): void => {
  // Check proxy target first if it's a proxy, otherwise check the object directly.
  const target = isProxy(obj) ? getProxyTarget(obj as any) : null;
  const changeFn = (target as any)?.[ChangeId] ?? (obj as any)[ChangeId];
  if (changeFn) {
    changeFn(callback);
  } else {
    callback(obj as Mutable<T>);
  }
};
