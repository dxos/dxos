//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Scope from 'effect/Scope';

import * as Capability from '@dxos/app-framework/Capability';
import { type Client } from '@dxos/client';
import type * as MemoryService from '@dxos/echo-memory/MemoryService';
import type * as RdfStore from '@dxos/echo-memory/RdfStore';
import * as EffectEx from '@dxos/effect/EffectEx';
import { SpaceId } from '@dxos/keys';
import { FactStore, type FactStoreApi, FactStoreMemory } from '@dxos/pipeline-rdf';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { BrainCapabilities } from '#types';

import * as QueryLog from '../query-log.ts';

/**
 * Each space's facts as a {@link FactStoreApi}, for surfaces and stories that read through one: every store is the
 * space's memory, which the client services host runs, so what they read is what operations wrote.
 */
export type FactStoreRegistry = {
  /** The space's memory as a FactStore. */
  forSpace: (spaceId: string) => FactStoreApi;
  /**
   * The same store, with every raw SPARQL read recorded in the space's query log, for a view's own queries; an
   * agent's are logged by the operation that runs them.
   */
  logged: (spaceId: string) => FactStoreApi;
  /** A Layer providing `FactStore` over the space's memory. */
  layerFor: (spaceId: string) => Layer.Layer<FactStore>;
  /**
   * Calls `listener` whenever the space's store applies a batch (a put, a reset, another device's writes); returns an
   * unsubscribe.
   */
  subscribe: (spaceId: string, listener: () => void) => () => void;
  /** The SPARQL queries run against a space's memory so far, oldest first. */
  queries: (spaceId: string) => readonly QueryLog.Entry[];
  /** Subscribe to a space's query log; the listener fires as each query starts and again as it ends. */
  subscribeQueries: (spaceId: string, listener: () => void) => () => void;
};

/** Where a registry finds each space's memory and the store it runs on. */
export type SpaceMemoryAccess = {
  /** Must return the same instance for a space each time, since the query log is keyed by it. */
  readonly memory: (spaceId: SpaceId) => MemoryService.Service;
  readonly rdf: (spaceId: SpaceId) => RdfStore.Service;
};

const spaceIdOf = (spaceId: string): SpaceId => {
  if (!SpaceId.isValid(spaceId)) {
    throw new TypeError(`Not a space id: ${spaceId}`);
  }
  return spaceId;
};

/** A registry over the given space memories. */
export const makeFactStoreRegistry = ({ memory, rdf }: SpaceMemoryAccess): FactStoreRegistry => {
  const forSpace = (spaceId: string): FactStoreApi => {
    const id = spaceIdOf(spaceId);
    return FactStoreMemory.make(memory(id), rdf(id));
  };
  return {
    forSpace,
    logged: (spaceId) => {
      const space = memory(spaceIdOf(spaceId));
      const inner = forSpace(spaceId);
      return {
        ...inner,
        rows: (sparql) => QueryLog.track(space, sparql, inner.rows(sparql), (rows) => rows),
        select: (sparql) => QueryLog.track(space, sparql, inner.select(sparql), () => []),
      };
    },
    layerFor: (spaceId) => Layer.succeed(FactStore, forSpace(spaceId)),
    subscribe: (spaceId, listener) => {
      const scope = Scope.makeUnsafe();
      void EffectEx.runPromise(rdf(spaceIdOf(spaceId)).listen(listener).pipe(Scope.provide(scope)));
      return () => void EffectEx.runPromise(Scope.close(scope, Exit.void));
    },
    queries: (spaceId) => QueryLog.entries(memory(spaceIdOf(spaceId))),
    subscribeQueries: (spaceId, listener) => QueryLog.subscribe(memory(spaceIdOf(spaceId)), listener),
  };
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);
    return Capability.contribute(
      BrainCapabilities.FactStoreRegistry,
      makeFactStoreRegistry({ memory: (spaceId) => client.memory(spaceId), rdf: (spaceId) => client.rdf(spaceId) }),
    );
  }),
);
