//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { defineHiddenProperty } from './define-hidden-property';
import { type ReactiveHandler } from './proxy-types';

/**
 * Carries a proxy on its own target, so `value[symbolProxy] === value` identifies a proxy: read through
 * the proxy it forwards to the target and answers the proxy, read on the raw target it answers something
 * else. A registry symbol rather than module state because a remote plugin can evaluate this module
 * twice, and a proxy made by one instance must still be recognized by the other.
 */
const symbolProxy = Symbol.for('@dxos/echo/Proxy');

/** A proxy's raw target, reachable through the proxy (which forwards the read to it) and off the target. */
const symbolTarget = Symbol.for('@dxos/echo/ProxyTarget');

/** The {@link ReactiveHandler} backing a target. Rewritten by {@link setProxyHandler}. */
const symbolReactiveHandler = Symbol.for('@dxos/echo/ReactiveHandler');

/**
 * Marker placed on a reactive-object behaviour prototype (e.g. the typed handler's
 * `TypedObject` prototype). A record target whose prototype chain carries this marker
 * is a reactive data record — equivalent, for the purposes of the "plain object" gates
 * below, to one rooted directly at `Object.prototype`. This lets a handler move its
 * per-object metadata onto an intermediate prototype without those gates mistaking the
 * record for a foreign class instance.
 */
export const symbolReactivePrototype = Symbol.for('@dxos/echo/ReactivePrototype');

/**
 * Internal api.
 */
export const isProxy = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && (value as any)[symbolProxy] === value;

/**
 * True if `value` is a plain data record — either rooted at `Object.prototype` or carrying
 * a reactive behaviour prototype (see {@link symbolReactivePrototype}).
 */
export const isReactiveRecord = (value: any): boolean => {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || (proto != null && !!proto[symbolReactivePrototype]);
};

export const isValidProxyTarget = (value: any): value is object => {
  // Settled before the symbol probe: a symbol lookup on a primitive boxes it and walks its wrapper
  // prototype, and this runs on every proxy read. Functions never qualify either — their prototype
  // chain is neither `Object.prototype` nor reactive.
  if (value == null || typeof value !== 'object') {
    return false;
  }
  if (value[symbolProxy] === value) {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }

  return isReactiveRecord(value);
};

export const getProxyTarget = <T extends object>(proxy: any): T => {
  const target = Reflect.get(proxy, symbolTarget);
  invariant(target, 'Not a reactive proxy.');
  return target;
};

export const getProxyHandler = <T extends object>(proxy: any): ReactiveHandler<T> => {
  const handler = Reflect.get(proxy, symbolReactiveHandler);
  invariant(handler, 'Not a reactive proxy.');
  return handler;
};

/**
 * Hands a target to a different handler, keeping the proxy — `db.add` converting an in-memory typed
 * object into a database-backed one, where the object's identity has to survive the conversion.
 */
export const setProxyHandler = <T extends object>(proxy: any, handler: ReactiveHandler<T>): void => {
  defineHiddenProperty(getProxyTarget(proxy), symbolReactiveHandler, handler);
};

/**
 * Clamp a splice range to `Array.prototype.splice` semantics for a string of the given `length`:
 * a negative `start` counts from the end, a `start` past the end appends, and `deleteCount` is bounded
 * to the remaining characters. Shared by both reactive handlers so the string CRDT API behaves
 * identically across the in-memory and Automerge backends (Automerge's `splice` otherwise throws on
 * out-of-range indices).
 */
export const normalizeSpliceRange = (
  length: number,
  start: number,
  deleteCount: number,
): { start: number; deleteCount: number } => {
  const safeStart = start < 0 ? Math.max(length + start, 0) : Math.min(start, length);
  const safeDeleteCount = Math.max(0, Math.min(deleteCount, length - safeStart));
  return { start: safeStart, deleteCount: safeDeleteCount };
};

/**
 * Create a reactive proxy object.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
 *
 * @param target Object or array. Passing in array will enable array methods.
 * @param handler ReactiveHandler instance.
 */
// TODO(burdon): Document.
// TODO(burdon): Tests for low-level functions.
export const createProxy = <T extends object>(target: T, handler: ReactiveHandler<T>): T => {
  const existingProxy = handler._proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  const proxy = new Proxy(target, REACTIVE_PROXY_HANDLER);
  // All three live on the target rather than on a per-proxy handler: the proxy has no `get` trap, so a
  // read of any of them forwards straight here, and one shared handler can serve every proxy.
  defineHiddenProperty(target, symbolTarget, target);
  defineHiddenProperty(target, symbolReactiveHandler, handler);
  defineHiddenProperty(target, symbolProxy, proxy);
  // Before `init`, which recurses into nested values: a graph that reaches back to this target must
  // find the proxy already memoized rather than build a second one.
  handler._proxyMap.set(target, proxy);
  handler.init(target);
  return proxy;
};

/**
 * The variant's handler, reached only on a write. Reads, key enumeration and `getPrototypeOf` are all
 * answered without it — the target carries the whole answer — so this is the only dispatch left, and it
 * is on the cold path.
 */
const trapOf = <K extends keyof ReactiveHandler<any>>(
  target: object,
  trap: K,
): { handler: ReactiveHandler<any>; fn: NonNullable<ReactiveHandler<any>[K]> } | undefined => {
  const handler: ReactiveHandler<any> | undefined = Reflect.get(target, symbolReactiveHandler);
  const fn = handler?.[trap];
  return handler && fn ? { handler, fn } : undefined;
};

/**
 * The handler behind every reactive proxy — one object, shared by every variant, with four traps.
 *
 * There is no `get`, `has`, `ownKeys` or `getOwnPropertyDescriptor`: a target carries its data as own
 * properties, so the engine answers all of those off the target itself with no JavaScript call. What is
 * left is the write gate, which exists because only a `Proxy` can make an assignment throw, and
 * `getPrototypeOf`, which hides the internal instance-state prototype so consumers see a plain object.
 * Neither of those needs to know which variant it is looking at, so `getPrototypeOf` does not dispatch
 * at all and the write traps dispatch only to reach the variant's write logic.
 */
const REACTIVE_PROXY_HANDLER: ProxyHandler<any> = {
  set: (target, property, value, receiver) => {
    const trap = trapOf(target, 'set');
    return trap
      ? trap.fn.call(trap.handler, target, property, value, receiver)
      : Reflect.set(target, property, value, receiver);
  },
  defineProperty: (target, property, attributes) => {
    const trap = trapOf(target, 'defineProperty');
    return trap
      ? trap.fn.call(trap.handler, target, property, attributes)
      : Reflect.defineProperty(target, property, attributes);
  },
  deleteProperty: (target, property) => {
    const trap = trapOf(target, 'deleteProperty');
    return trap ? trap.fn.call(trap.handler, target, property) : Reflect.deleteProperty(target, property);
  },
  // An array's real prototype chain is already what a consumer should see; only a record hides an
  // instance-state prototype behind `Object.prototype`.
  getPrototypeOf: (target) => (Array.isArray(target) ? Reflect.getPrototypeOf(target) : Object.prototype),
};
