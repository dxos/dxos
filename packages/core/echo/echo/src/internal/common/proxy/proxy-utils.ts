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

/** The {@link ProxyHandlerSlot} behind a proxy, reachable from the proxy and from its raw target. */
const symbolSlot = Symbol.for('@dxos/echo/ProxySlot');

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

/**
 * @deprecated
 */
export const getProxySlot = <T extends object>(proxy: any): ProxyHandlerSlot<T> => {
  const value = (proxy as any)?.[symbolSlot];
  invariant(value instanceof ProxyHandlerSlot);
  return value;
};

export const getProxyTarget = <T extends object>(proxy: any): T => {
  return getProxySlot<T>(proxy).target;
};

export const getProxyHandler = <T extends object>(proxy: any): ReactiveHandler<T> => {
  return getProxySlot<T>(proxy).handler;
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
 * Unsafe method to override id for debugging/testing and migration purposes.
 * @deprecated
 */
export const dangerouslySetProxyId = <T>(obj: T, id: string) => {
  (getProxySlot(obj).target as any).id = id;
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

  const slot = new ProxyHandlerSlot<T>(target, handler);
  const proxy = new Proxy(target, slot);
  // On the target, so that both it and a `get`-less proxy over it answer.
  defineHiddenProperty(target, symbolSlot, slot);
  defineHiddenProperty(target, symbolProxy, proxy);
  // Before `init`, which recurses into nested values: a graph that reaches back to this target must
  // find the proxy already memoized rather than build a second one.
  handler._proxyMap.set(target, proxy);
  handler.init(target);
  if (handler.readsForwarded?.(target)) {
    slot.forwardReads();
  }
  return proxy;
};

/**
 * Passed as the handler to the Proxy constructor.
 * Maintains a mutable slot for the actual handler.
 */
class ProxyHandlerSlot<T extends object> implements ProxyHandler<T> {
  /**
   * @param target Original object.
   * @param _handler Handles intercepted operations.
   */
  constructor(
    readonly target: T,
    private _handler: ReactiveHandler<T>,
  ) {}

  get handler() {
    invariant(this._handler);
    return this._handler;
  }

  // TODO(burdon): Requires comment.
  setHandler(handler: ReactiveHandler<T>): void {
    this._handler = handler;
    // The new handler owns the target's shape and decides for itself whether reads can be forwarded;
    // until it says so, reads go through its trap.
    this.#restoreReads();
  }

  /**
   * Drops this proxy's `get` trap: with no `get` on the handler the engine performs the read on the
   * target itself, so a target that carries its data as own properties is read with no JavaScript call.
   * Every other trap stays. Reversed by {@link setHandler}, since a swap can hand the target to a
   * handler that does not keep it filled.
   */
  forwardReads(): void {
    if (!Object.hasOwn(this, 'get')) {
      Object.defineProperty(this, 'get', { value: undefined, configurable: true });
    }
  }

  /** Restores the inherited `get` trap dropped by {@link forwardReads}. */
  #restoreReads(): void {
    delete this.get;
  }

  /**
   * Get value. Removed per proxy by {@link forwardReads} once the target carries its own data.
   */
  get?(target: T, prop: string | symbol, receiver: any): any {
    // Answered from the target ahead of the handler: these carry the proxy itself, and a handler that
    // wraps object-valued reads would wrap the proxy — and read the symbol again to decide whether to.
    if (prop === symbolProxy || prop === symbolSlot) {
      return Reflect.get(target, prop, receiver);
    }
    if (!this._handler || !this._handler.get) {
      return Reflect.get(target, prop, receiver);
    }

    return this._handler.get(target, prop, receiver);
  }

  static {
    const TRAPS: (keyof ProxyHandler<any>)[] = [
      'apply',
      'construct',
      'defineProperty',
      'deleteProperty',
      'get',
      'getOwnPropertyDescriptor',
      'getPrototypeOf',
      'has',
      'isExtensible',
      'ownKeys',
      'preventExtensions',
      'set',
      'setPrototypeOf',
    ];

    for (const trap of TRAPS) {
      if (trap === 'get') {
        continue;
      }

      Object.defineProperty(this.prototype, trap, {
        enumerable: false,
        value: function (this: ProxyHandlerSlot<any>, ...args: any[]) {
          // log.info('trap', { trap, args });
          if (!this._handler || !this._handler[trap]) {
            return (Reflect[trap] as Function)(...args);
          }

          return (this._handler[trap] as Function).apply(this._handler, args);
        },
      });
    }
  }
}
