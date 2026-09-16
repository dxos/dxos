//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import { EffectEx } from '@dxos/effect';

import { awaitNodes, firstOpenableChild } from './graph-wait.ts';

const setup = () => {
  const registry = Registry.make();
  const graph = AppGraph.make({ registry });
  AppGraph.addNode(graph, { id: 'root/w', type: 'test' });
  return { registry, graph };
};

describe('awaitNodes', () => {
  test('resolves once every missing node arrives', async ({ expect }) => {
    const { graph } = setup();
    const waiting = EffectEx.runPromise(awaitNodes(graph, ['root/w', 'root/w/a'], 1_000));
    setTimeout(() => AppGraph.addNode(graph, { id: 'root/w/a', type: 'test' }), 5);
    await waiting;
    expect(Option.isSome(AppGraph.getNode(graph, 'root/w/a'))).toBe(true);
  });

  test('gives up after the timeout for a node that never arrives', async ({ expect }) => {
    const { graph } = setup();
    const started = Date.now();
    await EffectEx.runPromise(awaitNodes(graph, ['root/w/never'], 20));
    expect(Date.now() - started).toBeLessThan(1_000);
  });
});

describe('firstOpenableChild', () => {
  test('resolves with the first child once one arrives', async ({ expect }) => {
    const { registry, graph } = setup();
    const waiting = EffectEx.runPromise(firstOpenableChild(registry, graph, 'root/w', 1_000));
    setTimeout(() => {
      AppGraph.addNode(graph, { id: 'root/w/a', type: 'test', data: {} });
      AppGraph.addEdge(graph, { source: 'root/w', target: 'root/w/a', relation: 'child' });
    }, 5);
    expect(await waiting).toBe('root/w/a');
  });

  test('is undefined when no child arrives in time', async ({ expect }) => {
    const { registry, graph } = setup();
    expect(await EffectEx.runPromise(firstOpenableChild(registry, graph, 'root/w', 20))).toBeUndefined();
  });
});
