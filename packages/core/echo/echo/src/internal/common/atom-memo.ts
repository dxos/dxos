//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';

import { isProxy } from './proxy/proxy-utils';

/**
 * Memoization for atoms derived from an ECHO entity, replacing `Atom.family` so that an atom lives
 * exactly as long as the entity proxy it derives from.
 *
 * A proxy is keyed weakly by identity: a `WeakMap` value may close over its own key without keeping
 * that key alive, so an entity the database releases takes its atoms, their cached snapshots, and
 * their subscriptions with it. Atom lifetime therefore follows object residency and needs no cache
 * policy of its own — one lifetime to reason about rather than an atom TTL layered under an object
 * TTL.
 *
 * `Atom.family` cannot express this: it holds its keys strongly until the memoized atom is
 * collected, so an atom the registry pins (`Atom.keepAlive`) pins the entity with it, forever.
 *
 * Non-proxy entities reach these families legitimately (queue-stored objects and other branded
 * shapes — see `subscribe`, which no-ops for them) and can mint a fresh object per read, so they
 * fall back to `Atom.family`'s id-based memoization; keying those by identity would churn a new
 * atom per render. Such an atom never updates in either case, its subscription being a no-op.
 */
export const memoizePerEntity = <K extends object, A extends object>(make: (key: K) => A): ((key: K) => A) => {
  const byProxy = new WeakMap<K, A>();
  const byId = Atom.family<K, A>(make);
  return (key) => {
    if (!isProxy(key)) {
      return byId(key);
    }
    const existing = byProxy.get(key);
    if (existing) {
      return existing;
    }
    const created = make(key);
    byProxy.set(key, created);
    return created;
  };
};

/**
 * Two-level variant of {@link memoizePerEntity}, for atoms keyed by an entity and a second key
 * (a property name, an annotation).
 *
 * The inner table is a plain `Map` held by the entity's entry, so it dies with the entity; its key
 * space is the entity's schema, which bounds it. Keeping the second level inside one entry also
 * avoids the nested-family hazard where the intermediate is only weakly held and can be collected
 * out from under its own mounted leaves.
 */
export const memoizePerEntityKey = <K extends object, K2, A extends object>(
  make: (key: K, subKey: K2) => A,
): ((key: K) => (subKey: K2) => A) => {
  const byProxy = new WeakMap<K, Map<K2, A>>();
  const byId = Atom.family<K, { readonly get: (subKey: K2) => A }>((key) => ({
    get: Atom.family<K2, A>((subKey) => make(key, subKey)),
  }));
  return (key) => {
    if (!isProxy(key)) {
      return byId(key).get;
    }
    let inner = byProxy.get(key);
    if (!inner) {
      inner = new Map<K2, A>();
      byProxy.set(key, inner);
    }
    const table = inner;
    return (subKey) => {
      const existing = table.get(subKey);
      if (existing) {
        return existing;
      }
      const created = make(key, subKey);
      table.set(subKey, created);
      return created;
    };
  };
};
