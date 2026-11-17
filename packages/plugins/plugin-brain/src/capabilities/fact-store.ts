//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { invariant } from '@dxos/invariant';
import { FactStore, type FactStoreApi, FactStoreLive, type SparqlRow } from '@dxos/pipeline-rdf';

import { BrainCapabilities } from '#types';

/**
 * Per-space in-memory registry: the shared {@link FactStore}, used as both the operation-injected
 * service and the surface-read store. Per-feed processing progress no longer lives here — it's a
 * persisted `Cursor` (`@dxos/link`), found/created directly by the operation that drives the fact
 * pipeline (e.g. `AnalyzeMailbox`), so it survives a reload independently of this in-memory store.
 */
export type FactStoreRegistry = {
  /** The singleton in-memory FactStore for a space (created on first use). */
  forSpace: (spaceId: string) => FactStoreApi;
  /**
   * The same store, with every raw SPARQL read recorded in the space's query log: the store operations are given,
   * so an agent's queries are logged while a surface's own reads through {@link forSpace} are not.
   */
  logged: (spaceId: string) => FactStoreApi;
  /** A Layer providing the {@link logged} store for a space, for operations. */
  layerFor: (spaceId: string) => Layer.Layer<FactStore>;
  /**
   * Subscribe to fact mutations for a space; the listener fires after any `putFacts`/`clear` on that
   * space's store. Returns an unsubscribe. The in-memory FactStore is not otherwise observable, so
   * this is how surfaces re-query when the analysis pipeline (or a reset) mutates the store.
   */
  subscribe: (spaceId: string, listener: () => void) => () => void;
  /** The SPARQL queries run against a space's store so far, oldest first (the last {@link QUERY_LOG_SIZE}). */
  queries: (spaceId: string) => readonly SparqlQueryRecord[];
  /** Subscribe to a space's query log; the listener fires as each query starts and again as it ends. */
  subscribeQueries: (spaceId: string, listener: () => void) => () => void;
};

/** One SPARQL query run against a space's store, by an agent's tool call or by the memory view. */
export type SparqlQueryRecord = {
  readonly id: number;
  readonly sparql: string;
  readonly startedAt: number;
  /** Absent while the query runs. */
  readonly result?: SparqlQueryResult;
};

/** How a logged query ended: its solution count and the first {@link QUERY_PREVIEW_ROWS} of them, or its error. */
export type SparqlQueryResult =
  | { readonly count: number; readonly preview: readonly SparqlRow[] }
  | { readonly error: string };

/** How many solutions of each logged query are kept for a view to show. */
export const QUERY_PREVIEW_ROWS = 50;

/** A space's log before its first query; one instance, since a view compares log snapshots by identity. */
const NO_QUERIES: readonly SparqlQueryRecord[] = [];

/** How many queries a space's log keeps. */
export const QUERY_LOG_SIZE = 100;

/**
 * Creates a registry that lazily builds one shared in-memory FactStore per space, so an operation's
 * injected service and a surface's read store observe identical state.
 */
export const makeFactStoreRegistry = (): FactStoreRegistry => {
  const stores = new Map<string, FactStoreApi>();
  const listenersBySpace = new Map<string, Set<() => void>>();
  const queryListenersBySpace = new Map<string, Set<() => void>>();
  const logsBySpace = new Map<string, SparqlQueryRecord[]>();
  let nextQueryId = 0;

  const notify = (spaceId: string): void => listenersBySpace.get(spaceId)?.forEach((listener) => listener());
  const notifyQueries = (spaceId: string): void =>
    queryListenersBySpace.get(spaceId)?.forEach((listener) => listener());

  const addListener = (map: Map<string, Set<() => void>>, spaceId: string, listener: () => void): (() => void) => {
    let listeners = map.get(spaceId);
    if (!listeners) {
      listeners = new Set();
      map.set(spaceId, listeners);
    }

    listeners.add(listener);
    return () => void listeners.delete(listener);
  };

  // Replaces the record rather than mutating it, so a view holding the previous log array sees a new one.
  const record = (spaceId: string, entry: SparqlQueryRecord): void => {
    const log = (logsBySpace.get(spaceId) ?? []).filter((existing) => existing.id !== entry.id);
    logsBySpace.set(spaceId, [...log, entry].sort((left, right) => left.id - right.id).slice(-QUERY_LOG_SIZE));
    notifyQueries(spaceId);
  };

  // Records a raw SPARQL read in the space's log as it starts and as it ends, so a view can follow the agent live.
  const logged = <A extends readonly unknown[], E>(
    spaceId: string,
    sparql: string,
    run: Effect.Effect<A, E>,
    preview: (result: A) => readonly SparqlRow[],
  ): Effect.Effect<A, E> =>
    Effect.suspend(() => {
      const entry: SparqlQueryRecord = { id: nextQueryId++, sparql, startedAt: Date.now() };
      record(spaceId, entry);
      return run.pipe(
        Effect.tap((result) =>
          Effect.sync(() =>
            record(spaceId, {
              ...entry,
              result: { count: result.length, preview: preview(result).slice(0, QUERY_PREVIEW_ROWS) },
            }),
          ),
        ),
        Effect.tapError((error) => Effect.sync(() => record(spaceId, { ...entry, result: { error: String(error) } }))),
      );
    });

  // Wraps a store so mutating operations notify subscribers after they succeed; the in-memory
  // FactStore has no change channel of its own, so this is the only observability surfaces get.
  const withNotify = (store: FactStoreApi, spaceId: string): FactStoreApi => ({
    ...store,
    putFacts: (facts) => store.putFacts(facts).pipe(Effect.tap(() => Effect.sync(() => notify(spaceId)))),
    importTrig: (trig) => store.importTrig(trig).pipe(Effect.tap(() => Effect.sync(() => notify(spaceId)))),
    clear: () => store.clear().pipe(Effect.tap(() => Effect.sync(() => notify(spaceId)))),
  });

  const forSpace = (spaceId: string): FactStoreApi => {
    let store = stores.get(spaceId);
    if (!store) {
      store = withNotify(FactStoreLive.makeMemory(), spaceId);
      stores.set(spaceId, store);
    }

    return store;
  };

  const subscribe: FactStoreRegistry['subscribe'] = (spaceId, listener) =>
    addListener(listenersBySpace, spaceId, listener);
  const subscribeQueries: FactStoreRegistry['subscribeQueries'] = (spaceId, listener) =>
    addListener(queryListenersBySpace, spaceId, listener);
  const queries: FactStoreRegistry['queries'] = (spaceId) => logsBySpace.get(spaceId) ?? NO_QUERIES;

  const loggedStores = new Map<string, FactStoreApi>();
  const loggedFor: FactStoreRegistry['logged'] = (spaceId) => {
    let store = loggedStores.get(spaceId);
    if (!store) {
      const inner = forSpace(spaceId);
      store = {
        ...inner,
        rows: (sparql) => logged(spaceId, sparql, inner.rows(sparql), (rows) => rows),
        select: (sparql) => logged(spaceId, sparql, inner.select(sparql), () => []),
      };
      loggedStores.set(spaceId, store);
    }

    return store;
  };

  const layerFor = (spaceId: string): Layer.Layer<FactStore> => Layer.succeed(FactStore, loggedFor(spaceId));
  return { forSpace, logged: loggedFor, layerFor, subscribe, queries, subscribeQueries };
};

/**
 * Contributes a single shared {@link FactStoreRegistry} plus a space-affinity {@link LayerSpec} that
 * provides `FactStore` to operations. Both close over the SAME registry, so the operation-injected
 * store and the capability-read store resolve to the same per-space instance.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = makeFactStoreRegistry();
    const factStoreSpec = LayerSpec.make(
      {
        affinity: 'space',
        requires: [],
        provides: [FactStore],
      },
      (context) => {
        invariant(context.space, 'space context required for FactStore layer');
        return registry.layerFor(context.space);
      },
    );

    return [
      Capability.contribute(BrainCapabilities.FactStoreRegistry, registry),
      Capability.contribute(Capabilities.LayerSpec, factStoreSpec),
    ];
  }),
);
