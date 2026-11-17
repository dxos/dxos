//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { Fact } from '@dxos/echo-memory';
import * as MemoryService from '@dxos/echo-memory/MemoryService';
import { DXN } from '@dxos/keys';
import { FactStore, type FactStoreApi, FactStoreHttp, FactStoreMemory } from '@dxos/pipeline-rdf';

import { BrainOperationHandlerSet } from '#operations';
import { BrainSkill } from '#skills';
import { BrainCapabilities } from '#types';

/** Where `moon run plugin-discord:fact-server` listens by default. */
export const DEFAULT_URL = 'http://127.0.0.1:7700';

export type Options = {
  /** Called with the facts each read by an operation (the Brain skill's tools) returns; the UI's own reads are not reported. */
  onOperationFacts?: (facts: readonly Fact.Fact[]) => void;
};

/** The store with every fact-returning read reported, so a story can show what an agent's tool looked at. */
const reporting = (store: FactStoreApi, report: (facts: readonly Fact.Fact[]) => void): FactStoreApi => ({
  ...store,
  query: (query) => store.query(query).pipe(Effect.tap((facts) => Effect.sync(() => report(facts)))),
  select: (sparql) => store.select(sparql).pipe(Effect.tap((facts) => Effect.sync(() => report(facts)))),
});

/**
 * Stands in for `BrainPlugin`'s fact store with one {@link FactStoreHttp} client, so every space's store is the remote
 * one a fact server exposes (e.g. a persisted Discord crawl): the registry surfaces read, the `FactStore` operations
 * are given, and the Brain skill with its operation handlers, so an agent can query the store. Use it instead of
 * `BrainPlugin`, whose registry capability is a singleton and whose other modules need the inbox and projects plugins.
 */
export const make = (url: string, { onOperationFacts }: Options = {}) =>
  Plugin.define(
    Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.stories.brain.remoteFactStore'), name: 'Remote Fact Store' }),
  ).pipe(
    Plugin.addModule({
      id: 'remote-fact-store',
      provides: [BrainCapabilities.FactStoreRegistry, Capabilities.LayerSpec],
      activate: Capability.makeModule(
        Effect.fnUntraced(function* () {
          const store = FactStoreHttp.make(url);
          const operationStore = onOperationFacts ? reporting(store, onOperationFacts) : store;
          return [
            Capability.contribute(BrainCapabilities.FactStoreRegistry, {
              forSpace: () => store,
              layerFor: () => Layer.succeed(FactStore, store),
              // The server has no change feed; the explorer re-queries on demand.
              subscribe: () => () => {},
            }),
            // The remote store ignores the space, so every space's operations share it.
            Capability.contribute(
              Capabilities.LayerSpec,
              LayerSpec.make({ affinity: 'space', requires: [], provides: [FactStore] }, () =>
                Layer.succeed(FactStore, operationStore),
              ),
            ),
            // Brain's operations read MemoryService; a process-affinity spec outranks the client's space memory, so
            // they read the remote store instead.
            Capability.contribute(
              Capabilities.LayerSpec,
              LayerSpec.make({ affinity: 'process', requires: [], provides: [MemoryService.MemoryService] }, () =>
                Layer.succeed(MemoryService.MemoryService, FactStoreMemory.toMemory(operationStore)),
              ),
            ),
          ];
        }),
      ),
    }),
    Plugin.addModule({
      id: 'remote-fact-store.brain-skill',
      provides: [AppCapabilities.SkillDefinition, Capabilities.OperationHandler],
      activate: () =>
        Effect.succeed([
          Capability.contribute(AppCapabilities.SkillDefinition, BrainSkill),
          Capability.contribute(Capabilities.OperationHandler, BrainOperationHandlerSet.handlers),
        ]),
    }),
    Plugin.make,
  )();
