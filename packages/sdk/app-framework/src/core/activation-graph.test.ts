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

  it.effect('buildRoundEdges separates hard singleton edges from soft multi edges', () =>
    Effect.gen(function* () {
      const [singleProvider, multiProvider, consumer] = modulesOf(
        { id: 'singleProvider', provides: [Single], activate: () => Effect.succeed([]) },
        { id: 'multiProvider', provides: [Multi], activate: () => Effect.succeed([]) },
        { id: 'consumer', requires: [Single, Multi], provides: [], activate: () => Effect.succeed([]) },
      );
      const modules = [singleProvider, multiProvider, consumer];
      const { hard, soft } = ActivationGraph.buildRoundEdges(modules, {
        isSatisfied: () => false,
        providerOf: (identifier) => (identifier === Single.identifier ? singleProvider.id : undefined),
        runnableIds: new Set(modules.map((module) => module.id)),
      });
      assert.deepStrictEqual([...(hard.get(singleProvider.id) ?? [])], [[consumer.id, Single.identifier]]);
      assert.deepStrictEqual([...(soft.get(multiProvider.id) ?? [])], [[consumer.id, Multi.identifier]]);
    }),
  );

  it.effect('computeActivationWaves orders a diamond and reports a cycle as undefined', () =>
    Effect.gen(function* () {
      const modules = modulesOf(
        { id: 'root', provides: [Multi], activate: () => Effect.succeed([]) },
        { id: 'left', provides: [], activate: () => Effect.succeed([]) },
        { id: 'right', provides: [], activate: () => Effect.succeed([]) },
        { id: 'sink', provides: [], activate: () => Effect.succeed([]) },
      );
      const edges: ActivationGraph.EdgeMap = new Map();
      ActivationGraph.addEdge(edges, id('root'), id('left'), 'x');
      ActivationGraph.addEdge(edges, id('root'), id('right'), 'x');
      ActivationGraph.addEdge(edges, id('left'), id('sink'), 'x');
      ActivationGraph.addEdge(edges, id('right'), id('sink'), 'x');

      const waves = ActivationGraph.computeActivationWaves(modules, edges);
      invariant(waves);
      assert.deepStrictEqual(
        waves.map((wave) => wave.map((module) => module.id)),
        [[id('root')], [id('left'), id('right')], [id('sink')]],
      );

      ActivationGraph.addEdge(edges, id('sink'), id('root'), 'x');
      assert.isUndefined(ActivationGraph.computeActivationWaves(modules, edges));
      const cycle = ActivationGraph.findCyclePath(modules, edges);
      assert.deepStrictEqual(new Set(cycle.map((entry) => entry.module)).size, cycle.length);
      assert.isAbove(cycle.length, 2);
    }),
  );

  it.effect('mergeEdges layers soft ordering over hard edges', () =>
    Effect.gen(function* () {
      const hard: ActivationGraph.EdgeMap = new Map();
      const soft: ActivationGraph.EdgeMap = new Map();
      ActivationGraph.addEdge(hard, 'a', 'b', 'x');
      ActivationGraph.addEdge(soft, 'a', 'c', 'y');
      ActivationGraph.addEdge(soft, 'd', 'b', 'z');
      const combined = ActivationGraph.mergeEdges(hard, soft);
      assert.deepStrictEqual(
        [...(combined.get('a') ?? [])],
        [
          ['b', 'x'],
          ['c', 'y'],
        ],
      );
      assert.deepStrictEqual([...(combined.get('d') ?? [])], [['b', 'z']]);
      // Inputs are not mutated.
      assert.strictEqual(hard.get('a')?.size, 1);
    }),
  );
});
