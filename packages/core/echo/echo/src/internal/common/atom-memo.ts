//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';

import { defineHiddenProperty } from './proxy/define-hidden-property.ts';
import { canonicalOf, getProxyTarget, isProxy } from './proxy/proxy-utils.ts';

/**
 * Memoization for atoms derived from an ECHO entity, replacing `Atom.family` so that an atom lives
 * exactly as long as the entity it derives from.
 *
 * Each memo stores its atom on the entity's proxy target under its own slot, the way `createProxy`
 * memoizes the proxy itself, so the entity owns its atoms and they are collected with it. `Atom.family`
 * cannot express this: it holds its keys strongly, so an atom the registry pins (`Atom.keepAlive`) pins
 * the entity with it, forever.
 *
 * A mutable view resolves to its read-only proxy, so both share one atom and the atom never captures
 * the callback-scoped write capability.
 *
 * Non-proxy entities (queue-stored objects and other branded shapes, for which `subscribe` no-ops) can
 * mint a fresh object per read, so they fall back to `Atom.family`'s id-based memoization.
 */
export const memoizePerEntity = <K extends object, A extends object>(make: (key: K) => A): ((key: K) => A) => {
  const slot = Symbol('atom');
  const byId = Atom.family<K, A>(make);
  return (key) => {
    if (!isProxy(key)) {
      return byId(key);
    }
    const target = getProxyTarget(key);
    const existing: A | undefined = Reflect.get(target, slot);
    if (existing) {
      return existing;
    }
    const created = make(canonicalOf(key));
    defineHiddenProperty(target, slot, created);
    return created;
  };
};

/**
 * Two-level variant of {@link memoizePerEntity}, for atoms keyed by an entity and a second key
 * (a property name, an annotation), whose table is bounded by the entity's schema.
 */
export const memoizePerEntityKey = <K extends object, K2, A extends object>(
  make: (key: K, subKey: K2) => A,
): ((key: K) => (subKey: K2) => A) => {
  const slot = Symbol('atoms');
  const byId = Atom.family<K, { readonly get: (subKey: K2) => A }>((key) => ({
    get: Atom.family<K2, A>((subKey) => make(key, subKey)),
  }));
  return (key) => {
    if (!isProxy(key)) {
      return byId(key).get;
    }
    const target = getProxyTarget(key);
    let table: Map<K2, A> | undefined = Reflect.get(target, slot);
    if (!table) {
      table = new Map();
      defineHiddenProperty(target, slot, table);
    }
    const entries = table;
    const entity: K = canonicalOf(key);
    return (subKey) => {
      const existing = entries.get(subKey);
      if (existing) {
        return existing;
      }
      const created = make(entity, subKey);
      entries.set(subKey, created);
      return created;
    };
  };
};
