//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import { useCallback, useSyncExternalStore } from 'react';

import { type LighthouseClient, type SessionUpdate } from '#client';
import { type SessionState, applyUpdate, emptySessionState } from '#model';

type Store = {
  state: SessionState;
  listeners: Set<() => void>;
  fiber?: Fiber.Fiber<never>;
};

/** One stream per session, shared by every surface showing it (the article and the result companion). */
const stores = new Map<string, Store>();

const EMPTY = emptySessionState();

const keyOf = (client: LighthouseClient, run: string) => `${client.endpoint.url}\n${run}`;

const getStore = (key: string): Store => {
  let store = stores.get(key);
  if (!store) {
    store = { state: emptySessionState(), listeners: new Set() };
    stores.set(key, store);
  }
  return store;
};

const dispatch = (store: Store, update: SessionUpdate) => {
  const next = applyUpdate(store.state, update);
  if (next !== store.state) {
    store.state = next;
    store.listeners.forEach((listener) => listener());
  }
};

/**
 * A lighthouse session, live: its summary, trajectory, results and rating, as the stream delivers them. The stream
 * opens with the first subscriber and closes with the last.
 */
export const useSession = (client: LighthouseClient | undefined, run: string | undefined) => {
  const key = client && run ? keyOf(client, run) : undefined;

  const subscribe = useCallback(
    (listener: () => void) => {
      if (!client || !run || !key) {
        return () => {};
      }
      const store = getStore(key);
      store.listeners.add(listener);
      if (!store.fiber) {
        store.fiber = Effect.runFork(client.streamSession(run, (update) => dispatch(store, update)));
      }
      return () => {
        store.listeners.delete(listener);
        if (store.listeners.size === 0 && store.fiber) {
          const fiber = store.fiber;
          store.fiber = undefined;
          stores.delete(key);
          Effect.runFork(Fiber.interrupt(fiber));
        }
      };
    },
    [client, run, key],
  );

  const getSnapshot = useCallback(() => (key ? (stores.get(key)?.state ?? EMPTY) : EMPTY), [key]);
  const state = useSyncExternalStore(subscribe, getSnapshot);

  /** Applies a local change ahead of the stream (an optimistic vote). */
  const update = useCallback(
    (change: (state: SessionState) => SessionState) => {
      const store = key ? stores.get(key) : undefined;
      if (store) {
        store.state = change(store.state);
        store.listeners.forEach((listener) => listener());
      }
    },
    [key],
  );

  return { state, update };
};
