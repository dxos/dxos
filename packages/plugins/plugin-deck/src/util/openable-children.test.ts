//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import { EffectEx } from '@dxos/effect';

import { firstOpenableChild } from './openable-children.ts';

const setup = () => {
  const registry = Registry.make();
  const graph = AppGraph.make({ registry });
  AppGraph.addNode(graph, { id: 'root/w', type: 'test' });
  return { registry, graph };
};

describe('firstOpenableChild', () => {
  test('resolves with the first child once one arrives', async ({ expect }) => {
    const { registry, graph } = setup();
    const connections = graph.connections('root/w', 'child');
    const waiting = EffectEx.runPromise(firstOpenableChild(registry, graph, 'root/w', 1_000));

    // Wait for `firstOpenableChild`'s own subscription to register before adding the child, so the
    // test exercises the "arrives later" path deterministically rather than racing a fixed delay.
    await expect.poll(() => registry.getNodes().get(connections)?.listeners.size).toBe(1);

    AppGraph.addNode(graph, { id: 'root/w/a', type: 'test', data: {} });
    AppGraph.addEdge(graph, { source: 'root/w', target: 'root/w/a', relation: 'child' });
    expect(await waiting).toBe('root/w/a');
    expect(registry.getNodes().get(connections)?.listeners.size ?? 0).toBe(0);
  });

  test('resolves with a child already present and stops listening', async ({ expect }) => {
    const { registry, graph } = setup();
    AppGraph.addNode(graph, { id: 'root/w/a', type: 'test', data: {} });
    AppGraph.addEdge(graph, { source: 'root/w', target: 'root/w/a', relation: 'child' });

    expect(await EffectEx.runPromise(firstOpenableChild(registry, graph, 'root/w', 1_000))).toBe('root/w/a');
    expect(registry.getNodes().get(graph.connections('root/w', 'child'))?.listeners.size ?? 0).toBe(0);
  });

  test('is undefined when no child arrives in time', async ({ expect }) => {
    const { registry, graph } = setup();
    expect(await EffectEx.runPromise(firstOpenableChild(registry, graph, 'root/w', 20))).toBeUndefined();
  });
});
