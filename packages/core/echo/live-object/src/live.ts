//
// Copyright 2025 DXOS.org
//

import { getProxyTarget, isProxy } from './proxy';

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
 */
export type Live<T> = LiveMarker & T;

/**
 * @returns true if the value is a reactive object.
 * @deprecated The code should not rely on "liveness" of the object. Better way would be to check the type of the object or if object is mutable.
 */
export const isLiveObject = (value: unknown): boolean => isProxy(value);

// TODO(dmaretskyi): Rename all symbols that are props to end with *Key.
export const EventId = Symbol.for('@dxos/live-object/EventId');

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
