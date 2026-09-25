//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { describe, test } from 'vitest';

import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import { EffectEx } from '@dxos/effect';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import { Path } from '@dxos/react-ui-list';

import { createGraphTreeModel } from './useGraphTreeModel.ts';

describe('createGraphTreeModel', () => {
  const setup = async () => {
    const extensions = await EffectEx.runPromise(
      AppGraphBuilder.createExtension({
        id: 'test',
        match: GraphNodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            { id: 'a', type: 'page', data: 'a', properties: { label: 'A' } },
            { id: 'hidden', type: 'page', data: 'h', properties: { label: 'H', disposition: 'hidden' } },
            {
              id: 'group',
              type: 'group',
              data: null,
              properties: { label: 'G', disposition: 'group' },
              nodes: [{ id: 'b', type: 'page', data: 'b', properties: { label: 'B' } }],
            },
          ]),
      }),
    );
    const context = setupGraphBuilder({ extensions });
    await context.expand(GraphNode.RootId);
    await context.expand(`${GraphNode.RootId}/group`);
    const openPaths = new Set<string>();
    const openAtom = Atom.make(openPaths);
    const model = createGraphTreeModel(context.graph, GraphNode.RootId, {
      itemOpen: (path) => Atom.make((get) => get(openAtom).has(Path.create(...path))),
      itemCurrent: (path) => Atom.make(() => Path.last(Path.create(...path)) === `${GraphNode.RootId}/b`),
    });
    return { ...context, model };
  };

  test('lists visible children of the root, dropping hidden nodes', async ({ expect }) => {
    const { registry, model } = await setup();
    expect(registry.get(model.childIds())).toEqual([`${GraphNode.RootId}/a`, `${GraphNode.RootId}/group`]);
  });

  test('maps node properties to row props; groups are disabled, undraggable, not branches', async ({ expect }) => {
    const { registry, model } = await setup();
    const group = registry.get(model.itemProps([GraphNode.RootId, `${GraphNode.RootId}/group`]));
    expect(group.disposition).toBe('group');
    expect(group.disabled).toBe(true);
    expect(group.draggable).toBe(false);
    expect(group.parentOf).toBeUndefined();
    const page = registry.get(model.itemProps([GraphNode.RootId, `${GraphNode.RootId}/a`]));
    expect(page.label).toBe('A');
  });

  test('current comes from the caller', async ({ expect }) => {
    const { registry, model } = await setup();
    expect(
      registry.get(model.itemCurrent([GraphNode.RootId, `${GraphNode.RootId}/group`, `${GraphNode.RootId}/b`])),
    ).toBe(true);
    expect(registry.get(model.itemCurrent([GraphNode.RootId, `${GraphNode.RootId}/a`]))).toBe(false);
  });
});
