//
// Copyright 2026 DXOS.org
//

import { assert, describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import * as ActivationGraph from './activation-graph';
import * as Capability from './capability';
import * as Plugin from './plugin';

const Single = Capability.makeSingleton<{ value: string }>()('org.dxos.test.graphSingle');
const Single2 = Capability.makeSingleton<{ value: string }>()('org.dxos.test.graphSingleTwo');
const Multi = Capability.make<{ value: string }>()('org.dxos.test.graphMulti');

const meta = Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.graphTest'), name: 'GraphTest' });

/** Builds real PluginModules from entries via the public plugin builder. */
const modulesOf = (...entries: Plugin.ModuleEntry[]): Plugin.PluginModule[] => {
  const builder = Plugin.define(meta);
  entries.forEach((entry) => builder.addModule(entry));
  return [...Plugin.make(builder)().modules];
};

const id = (name: string) => `${meta.profile.key}.module.${name}`;

describe('ActivationGraph', () => {
  it.effect('computeRunnableFixpoint pends a consumer whose provider is out of play and reports missing', () =>
    Effect.gen(function* () {
      const [provider, consumer, orphan] = modulesOf(
        { id: 'provider', provides: [Single], activate: () => Effect.succeed([]) },
        { id: 'consumer', requires: [Single], provides: [], activate: () => Effect.succeed([]) },
        { id: 'orphan', requires: [Multi, Single], provides: [], activate: () => Effect.succeed([]) },
      );

      // Provider runnable: both consumers admitted (multi never gates).
      const admitted = ActivationGraph.computeRunnableFixpoint({
        candidates: [provider, consumer, orphan],
        excluded: new Set(),
        isSatisfied: () => false,
        providerOf: (identifier) => (identifier === Single.identifier ? provider.id : undefined),
        activeIds: [],
        anyRegisteredProvider: () => true,
      });
      assert.deepStrictEqual(
        admitted.runnable.map((module) => module.id),
        [provider.id, consumer.id, orphan.id],
      );
      assert.deepStrictEqual(admitted.missing, []);

      // Provider excluded and unregistered: consumers pend; the unprovidable require is missing.
      const pended = ActivationGraph.computeRunnableFixpoint({
        candidates: [consumer, orphan],
        excluded: new Set(),
        isSatisfied: () => false,
        providerOf: () => undefined,
        activeIds: [],
        anyRegisteredProvider: () => false,
      });
      assert.deepStrictEqual(pended.runnable, []);
      assert.strictEqual(pended.missing.length, 2);
      assert.strictEqual(pended.pended.length, 2);
    }),
  );

  it.effect('computeRunnableFixpoint cascades pends through provider chains', () =>
    Effect.gen(function* () {
      // gated provides for dependent but itself pends on an out-of-play provider: the fixpoint
      // removes gated first, which unseats dependent in the next iteration.
      const [gated, dependent] = modulesOf(
        { id: 'gated', requires: [Single2], provides: [Single], activate: () => Effect.succeed([]) },
        { id: 'dependent', requires: [Single], provides: [], activate: () => Effect.succeed([]) },
      );
      const result = ActivationGraph.computeRunnableFixpoint({
        candidates: [gated, dependent],
        excluded: new Set(),
        isSatisfied: () => false,
        // Single resolves to gated within the round; Single2's provider is registered somewhere
        // (e.g. event-gated) but not runnable here and not active.
        providerOf: (identifier) => (identifier === Single.identifier ? gated.id : undefined),
        activeIds: [],
        anyRegisteredProvider: () => true,
      });
      assert.deepStrictEqual(result.runnable, []);
      assert.deepStrictEqual(result.missing, []);
      assert.deepStrictEqual(
        result.pended.map((pend) => pend.module.id),
        [gated.id, dependent.id],
      );
    }),
  );

  it.effect('buildRoundGraph separates hard singleton edges from soft multi edges', () =>
    Effect.gen(function* () {
      const [singleProvider, multiProvider, consumer] = modulesOf(
        { id: 'singleProvider', provides: [Single], activate: () => Effect.succeed([]) },
        { id: 'multiProvider', provides: [Multi], activate: () => Effect.succeed([]) },
        { id: 'consumer', requires: [Single, Multi], provides: [], activate: () => Effect.succeed([]) },
      );
      const graph = ActivationGraph.buildRoundGraph([singleProvider, multiProvider, consumer], {
        isSatisfied: () => false,
        providerOf: (identifier) => (identifier === Single.identifier ? singleProvider.id : undefined),
      });
      assert.deepStrictEqual(
        graph.filterEdges({ type: 'hard' }).map((edge) => [edge.source, edge.target, edge.data.capability]),
        [[singleProvider.id, consumer.id, Single.identifier]],
      );
      assert.deepStrictEqual(
        graph.filterEdges({ type: 'soft' }).map((edge) => [edge.source, edge.target, edge.data.capability]),
        [[multiProvider.id, consumer.id, Multi.identifier]],
      );
      assert.deepStrictEqual(ActivationGraph.hardProviderIds(graph, consumer.id), [singleProvider.id]);
      assert.isTrue(ActivationGraph.hasSoftEdges(graph));
    }),
  );

  it.effect('computeActivationWaves orders by hard edges and layers soft ordering on request', () =>
    Effect.gen(function* () {
      const [singleProvider, multiProvider, consumer] = modulesOf(
        { id: 'singleProvider', provides: [Single], activate: () => Effect.succeed([]) },
        { id: 'multiProvider', provides: [Multi], activate: () => Effect.succeed([]) },
        { id: 'consumer', requires: [Single, Multi], provides: [], activate: () => Effect.succeed([]) },
      );
      const graph = ActivationGraph.buildRoundGraph([consumer, singleProvider, multiProvider], {
        isSatisfied: () => false,
        providerOf: (identifier) => (identifier === Single.identifier ? singleProvider.id : undefined),
      });

      // Hard-only: the multi provider is unordered relative to the consumer.
      const hardWaves = ActivationGraph.computeActivationWaves(graph, ['hard']);
      invariant(hardWaves);
      assert.deepStrictEqual(
        hardWaves.map((wave) => wave.map((module) => module.id).toSorted()),
        [[multiProvider.id, singleProvider.id].toSorted(), [consumer.id]],
      );

      // Hard+soft: both providers precede the consumer.
      const combined = ActivationGraph.computeActivationWaves(graph, ['hard', 'soft']);
      invariant(combined);
      assert.deepStrictEqual(
        combined.at(-1)?.map((module) => module.id),
        [consumer.id],
      );
    }),
  );

  it.effect('cycle excision: removeNodes drops incident edges and findCyclePath names the loop', () =>
    Effect.gen(function* () {
      // a -> b -> c -> a via singleton requires (a legal declaration error, diagnosed at runtime).
      const [a, b, c] = modulesOf(
        { id: 'a', requires: [Single2], provides: [Single], activate: () => Effect.succeed([]) },
        { id: 'b', requires: [Single], provides: [Multi], activate: () => Effect.succeed([]) },
        { id: 'c', requires: [Multi], provides: [Single2], activate: () => Effect.succeed([]) },
      );
      const graph = ActivationGraph.buildSingletonGraph([a, b, c]);
      // Singleton graph: a -> b (Single), c -> a (Single2); multi require b<-c is skipped.
      assert.isDefined(ActivationGraph.computeActivationWaves(graph, ['hard']));

      const cyclic = ActivationGraph.buildSingletonGraph([
        ...modulesOf(
          { id: 'x', requires: [Single2], provides: [Single], activate: () => Effect.succeed([]) },
          { id: 'y', requires: [Single], provides: [Single2], activate: () => Effect.succeed([]) },
        ),
      ]);
      assert.isUndefined(ActivationGraph.computeActivationWaves(cyclic, ['hard']));
      const path = ActivationGraph.findCyclePath(cyclic, ['hard']);
      assert.deepStrictEqual(new Set(path.map((entry) => entry.module)), new Set([id('x'), id('y')]));

      cyclic.removeNodes([id('x')]);
      assert.isDefined(ActivationGraph.computeActivationWaves(cyclic, ['hard']));
      assert.strictEqual(cyclic.edges.length, 0);
    }),
  );
});
