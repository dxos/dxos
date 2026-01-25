//
// Copyright 2025 DXOS.org
//

import { getProxyTarget, isProxy } from './proxy';
import { ChangeId, EventId } from './symbols';

/**
 * Marker interface.
 * This odd construct only serves one purpose: when you hover over `const x: Live<T>` you'd see `Live<T>` type.
 * Without this, typescript would simplify the type to just `T` instead.
 */
interface LiveMarker {}

/**
 * Live reactive object marker interface (does not change the shape of the object.)
 * Accessing properties triggers signal semantics.
 *
 * It is recommended to use explicitly use this type when expecting reactive semantics, e.g. `Live<MyObject>`.
 * One common use case includes React components.
 *
 * @deprecated
 */
export type Live<T> = LiveMarker & T;

/**
 * @returns true if the value is a reactive object.
 * @deprecated The code should not rely on "liveness" of the object. Better way would be to check the type of the object or if object is mutable.
 */
export const isLiveObject = (value: unknown): boolean => isProxy(value);

/**
 * Subscribe to changes on a live object.
 * @param obj - The live object to subscribe to.
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
 * Recursively removes readonly modifiers from all properties of T.
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P] extends object ? Mutable<T[P]> : T[P];
};

/**
 * Callback type for the change function.
 */
export type ChangeCallback<T> = (mutableObj: Mutable<T>) => void;

/**
 * Perform mutations on a live object within a change context.
 *
 * If the object has a change handler (via ChangeId), it will be called with the callback.
 * This allows handlers to implement features like:
 * - Readonly enforcement (mutations only allowed within change context)
 * - Batched notifications (single notification for all mutations in the callback)
 * - Transaction semantics
 *
 * If the object doesn't have a change handler, the callback is called directly.
 *
 * @param obj - The live object to mutate.
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
