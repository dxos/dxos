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

import { awaitReleaseSettled, firstOpenableChild } from './graph-wait.ts';

const setup = () => {
  const registry = Registry.make();
  const graph = AppGraph.make({ registry });
  AppGraph.addNode(graph, { id: 'root/w', type: 'test' });
  return { registry, graph };
};

const workspaceWithReleasedItems = async () => {
  const registry = Registry.make();
  const builder = AppGraphBuilder.make({ registry });
  const items = Atom.make(['a']).pipe(Atom.keepAlive);
  AppGraphBuilder.addExtension(builder, [
    ...Effect.runSync(
      AppGraphBuilder.createExtension({
        id: 'workspace',
        match: GraphNodeMatcher.whenRoot,
        connector: () => Effect.succeed([{ id: 'w', type: 'workspace' }]),
      }),
    ),
    ...Effect.runSync(
      AppGraphBuilder.createExtension({
        id: 'items',
        match: GraphNodeMatcher.whenNodeType('workspace'),
        connector: (_node, get) => Effect.succeed(get(items).map((id) => ({ id, type: 'item' }))),
      }),
    ),
  ]);
  for (const id of [GraphNode.RootId, 'root/w']) {
    AppGraph.expandSync(builder.graph, id, 'child');
    await AppGraphBuilder.flush(builder);
  }
  AppGraphBuilder.setRetention(builder, [{ retained: Atom.make([]) }]);
  await AppGraphBuilder.flush(builder);
  return { registry, builder, items };
};

describe('awaitReleaseSettled', () => {
  test('resolves at once for subjects that were never released', async ({ expect }) => {
    const { registry, builder } = await workspaceWithReleasedItems();
    const started = Date.now();
    await EffectEx.runPromise(awaitReleaseSettled(registry, builder, ['root/w/never'], 1_000));
    expect(Date.now() - started).toBeLessThan(500);
  });

  test('resolves once a released subject is produced again', async ({ expect }) => {
    const { registry, builder } = await workspaceWithReleasedItems();
    expect(AppGraphBuilder.wasReleased(builder, 'root/w/a')).toBe(true);
    const waiting = EffectEx.runPromise(awaitReleaseSettled(registry, builder, ['root/w/a'], 1_000));
    AppGraph.expandSync(builder.graph, 'root/w', 'child');
    await waiting;
    expect(Option.isSome(AppGraph.getNode(builder.graph, 'root/w/a'))).toBe(true);
  });

  test('resolves without the subject once its workspace no longer produces it', async ({ expect }) => {
    const { registry, builder, items } = await workspaceWithReleasedItems();
    registry.set(items, []);
    const started = Date.now();
    const waiting = EffectEx.runPromise(awaitReleaseSettled(registry, builder, ['root/w/a'], 5_000));
    AppGraph.expandSync(builder.graph, 'root/w', 'child');
    await waiting;
    expect(Date.now() - started).toBeLessThan(2_000);
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
