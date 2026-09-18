//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import { EffectEx } from '@dxos/effect';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';

import { firstOpenableChild } from './graph-wait.ts';

const setup = () => {
  const registry = Registry.make();
  const graph = AppGraph.make({ registry });
  AppGraph.addNode(graph, { id: 'root/w', type: 'test' });
  return { registry, graph };
};

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
