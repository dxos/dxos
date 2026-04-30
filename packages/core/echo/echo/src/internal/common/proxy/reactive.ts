//
// Copyright 2025 DXOS.org
//

import { type RefTypeId } from '../../Ref/ref';
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
  // Guard against non-reactive inputs (queue-stored typed objects, snapshots, plain shapes
  // with branded symbols) before `getProxyTarget`'s `ProxyHandlerSlot` invariant kicks in.
  // `Obj.isObject` (KindId-based) is satisfied by these inputs, so callers like
  // `Atom.family((obj) => Atom.make((get) => Obj.subscribe(obj, ...)))` legitimately reach
  // here with a non-proxy. Falling back to a no-op preserves the documented contract that
  // values without subscription support get a no-op unsubscribe.
  if (!isProxy(obj)) {
    return () => {};
  }
  const target = getProxyTarget(obj as any);
  if (target && EventId in target) {
    return (target as any)[EventId].on(callback);
  }
  return () => {};
};

/**
 * Deeply removes readonly modifiers from all properties of T.
 * Inside Obj.change, all properties are fully mutable regardless of schema definition.
 * Ref types are preserved as-is since they are value-like objects that are replaced, not mutated.
 * Primitive types (including branded primitives) are preserved as-is.
 */
export type Mutable<T> = T extends string | number | boolean | bigint | symbol | null | undefined
  ? T // Primitives (including branded primitives like JsonPath) stay as-is.
  : T extends { [RefTypeId]: any }
    ? T // Keep Ref types as-is (they're value-like, not mutated in place).
    : T extends object
      ? T extends readonly (infer U)[]
        ? Mutable<U>[]
        : { -readonly [K in keyof T]: Mutable<T[K]> }
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
  // Check proxy first (allows handler to intercept), then fall back to target.
  // This order is important for EchoReactiveHandler which handles ChangeId in the proxy trap.
  const changeFn = (obj as any)[ChangeId];
  if (changeFn) {
    changeFn(callback);
  } else {
    callback(obj as Mutable<T>);
  }
};
