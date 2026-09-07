//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { defineHiddenProperty } from './define-hidden-property';
import { createPropertyDeleteError, createPropertySetError } from './errors';
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
 * A target's mutable view — the reference an `Obj.update` callback is handed. Writability belongs to the
 * reference, not to the callback's dynamic extent: the proxy named outside the callback stays read-only
 * for the callback's whole duration, so the only way to mutate is through what the callback was given.
 */
const symbolMutableProxy = Symbol.for('@dxos/echo/MutableProxy');

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
  // The target carries its own proxy, so it is also the memo — a per-handler `WeakMap` would answer the
  // same question, and wrongly after `setProxyHandler` moved a target between handlers.
  const raw: object = target;
  const existingProxy: T | undefined = Reflect.get(raw, symbolProxy);
  if (existingProxy) {
    return existingProxy;
  }

  const proxy = new Proxy(target, REACTIVE_PROXY_HANDLER);
  // All three live on the target rather than on a per-proxy handler: the proxy has no `get` trap, so a
  // read of any of them forwards straight here, and one shared handler can serve every proxy. Stamped
  // before `init`, which recurses into nested values: a graph that reaches back to this target must find
  // the proxy already memoized rather than build a second one.
  defineHiddenProperty(target, symbolTarget, target);
  defineHiddenProperty(target, symbolReactiveHandler, handler);
  defineHiddenProperty(target, symbolProxy, proxy);
  handler.init(target);
  return proxy;
};

/**
 * The variant's write logic, reached only once a mutation is known to be allowed.
 */
const writeHandlerOf = (target: object): ReactiveHandler<any> | undefined => Reflect.get(target, symbolReactiveHandler);

/**
 * The mutable view of `value`, memoized on its target beside the read-only proxy. Handed to an
 * `Obj.update` callback, and reached from there by navigation: the `get` trap below hands back the
 * mutable twin of any nested proxy, so `obj.rec.list` inside a callback is mutable all the way down
 * while the same path off the outer reference stays read-only.
 */
export const getMutableProxy = <T extends object>(value: T): T => {
  const target: object = isProxy(value) ? getProxyTarget(value) : value;
  const existing: T | undefined = Reflect.get(target, symbolMutableProxy);
  if (existing) {
    return existing;
  }

  const proxy = new Proxy(target, MUTABLE_PROXY_HANDLER);
  defineHiddenProperty(target, symbolMutableProxy, proxy);
  return proxy as T;
};

/**
 * True for a mutable view itself. Distinguishable from a read-only proxy because the `get` trap twins
 * this read too, so a view answers itself where a read-only proxy answers the view (or nothing).
 */
const isMutableProxy = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && (value as any)[symbolMutableProxy] === value;

/**
 * The reference to store for a value being written. A mutable view is a callback-scoped handle and must
 * never enter the graph — storing one would hand a permanent write capability to every later reader, and
 * would break identity for code that kept the read-only reference. Read off the raw target rather than
 * through the view, whose `get` would twin the answer straight back into a view.
 */
export const canonicalOf = (value: any): any => {
  if (!isMutableProxy(value)) {
    return value;
  }
  const target = Reflect.get(value, symbolTarget);
  return Reflect.get(target, symbolProxy) ?? target;
};

/**
 * {@link canonicalOf}, applied through the literal being assigned. A view can sit anywhere inside it
 * (`obj.rows = [obj.rec]`), and normalizing only the top level would let one into the graph. Descends
 * only into plain containers: a proxy is already canonical, and rewriting one would be a stray write.
 */
const normalizeForStorage = (value: any, seen = new Set<object>()): any => {
  const canonical = canonicalOf(value);
  if (canonical == null || typeof canonical !== 'object' || isProxy(canonical) || seen.has(canonical)) {
    return canonical;
  }
  seen.add(canonical);

  // Written back only where normalizing actually changed something: the value may be a frozen or
  // shared constant, and rewriting a key with the value it already holds would throw on the former
  // and be a stray mutation of the latter.
  if (Array.isArray(canonical)) {
    canonical.forEach((element, index) => {
      const normalized = normalizeForStorage(element, seen);
      if (normalized !== element) {
        canonical[index] = normalized;
      }
    });
  } else {
    for (const key of Object.keys(canonical)) {
      const normalized = normalizeForStorage(canonical[key], seen);
      if (normalized !== canonical[key]) {
        canonical[key] = normalized;
      }
    }
  }
  return canonical;
};

/**
 * The handler behind a mutable view. Writes reach the variant's logic with no gate — being here is the
 * permission — and reads hand back mutable twins so navigation stays mutable.
 *
 * `[symbolProxy]` is twinned like any other proxy-valued read, which is what makes `isProxy` answer true
 * for a mutable view without knowing it exists: the read forwards to the target, finds the read-only
 * proxy, and comes back as this proxy, so `view[symbolProxy] === view` holds. `[symbolTarget]` is not a
 * proxy, so it still answers the raw target and `getRawTarget` unwraps a view correctly.
 */
const MUTABLE_PROXY_HANDLER: ProxyHandler<any> = {
  get: (target, property, receiver) => {
    const value = Reflect.get(target, property, receiver);
    return isProxy(value) ? getMutableProxy(value) : value;
  },
  set: (target, property, value, receiver) => {
    const handler = writeHandlerOf(target);
    const stored = normalizeForStorage(value);
    return handler?.set
      ? handler.set(target, property, stored, receiver)
      : Reflect.set(target, property, stored, receiver);
  },
  defineProperty: (target, property, attributes) => {
    const handler = writeHandlerOf(target);
    const stored = { ...attributes, value: normalizeForStorage(attributes.value) };
    return handler?.defineProperty
      ? handler.defineProperty(target, property, stored)
      : Reflect.defineProperty(target, property, stored);
  },
  deleteProperty: (target, property) => {
    const handler = writeHandlerOf(target);
    return handler?.deleteProperty
      ? handler.deleteProperty(target, property)
      : Reflect.deleteProperty(target, property);
  },
  getPrototypeOf: (target) => (Array.isArray(target) ? Reflect.getPrototypeOf(target) : Object.prototype),
};

/**
 * This reference is read-only, and no state can change that: a mutation is allowed by holding the
 * mutable view (which `Obj.update` hands its callback), never by when it happens. Constant-cost and
 * fail-closed — there is no state to be wrong about, which is what a context lookup could not promise.
 *
 * Symbols are exempt because they are never user data: the system stamps `[ParentId]`, `[SelfURIId]`
 * and the schema-slot cache outside any change context, on objects consumers hold read-only.
 */
const assertReadOnly = (property: string | symbol, createError: (property: string | symbol) => Error): void => {
  if (typeof property !== 'symbol') {
    throw createError(property);
  }
};

/**
 * The handler behind every reactive proxy — one object, shared by every variant, with four traps.
 *
 * There is no `get`, `has`, `ownKeys` or `getOwnPropertyDescriptor`: a target carries its data as own
 * properties, so the engine answers all of those off the target itself with no JavaScript call. What is
 * left is the write gate, which exists because only a `Proxy` can make an assignment throw, and
 * `getPrototypeOf`, which hides the internal instance-state prototype so consumers see a plain object.
 *
 * The read-only path through this handler is therefore identical for every variant and dispatches
 * nowhere: `getPrototypeOf` is one `Array.isArray`, and a write outside `Obj.update` throws before any
 * handler is consulted. Dispatch happens only for a mutation that is actually allowed.
 */
const REACTIVE_PROXY_HANDLER: ProxyHandler<any> = {
  set: (target, property, value, receiver) => {
    assertReadOnly(property, createPropertySetError);
    const handler = writeHandlerOf(target);
    return handler?.set
      ? handler.set(target, property, value, receiver)
      : Reflect.set(target, property, value, receiver);
  },
  defineProperty: (target, property, attributes) => {
    assertReadOnly(property, createPropertySetError);
    const handler = writeHandlerOf(target);
    return handler?.defineProperty
      ? handler.defineProperty(target, property, attributes)
      : Reflect.defineProperty(target, property, attributes);
  },
  deleteProperty: (target, property) => {
    assertReadOnly(property, createPropertyDeleteError);
    const handler = writeHandlerOf(target);
    return handler?.deleteProperty
      ? handler.deleteProperty(target, property)
      : Reflect.deleteProperty(target, property);
  },
  // An array's real prototype chain is already what a consumer should see; only a record hides an
  // instance-state prototype behind `Object.prototype`.
  getPrototypeOf: (target) => (Array.isArray(target) ? Reflect.getPrototypeOf(target) : Object.prototype),
};
