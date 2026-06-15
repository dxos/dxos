//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { Node } from '@dxos/app-graph';

import { buildGraphMenu } from './useGraphMenuActions';

const action = (id: string, properties: Record<string, any> = {}): Node.ActionLike => ({
  id,
  type: Node.ActionType,
  properties,
  data: () => Effect.void,
});

const group = (id: string, properties: Record<string, any> = {}): Node.ActionLike => ({
  id,
  type: Node.ActionGroupType,
  properties,
  data: Node.actionGroupSymbol,
});

const resolver =
  (map: Record<string, Node.ActionLike[]>) =>
  (id: string): Node.ActionLike[] =>
    map[id] ?? [];

describe('buildGraphMenu', () => {
  test('flattens a node’s actions under the menu root', ({ expect }) => {
    const resolve = resolver({ event: [action('delete'), action('save')] });
    const { nodes, edges } = buildGraphMenu(resolve, 'event');

    expect(nodes.map((node) => node.id)).toEqual(['delete', 'save']);
    expect(edges).toEqual([
      { source: Node.RootId, target: 'delete', relation: 'child' },
      { source: Node.RootId, target: 'save', relation: 'child' },
    ]);
  });

  test('expands nested action groups via their own id', ({ expect }) => {
    const resolve = resolver({
      event: [action('delete'), group('more')],
      more: [action('archive'), action('export')],
    });
    const { nodes, edges } = buildGraphMenu(resolve, 'event');

    // root → delete, root → more (group), more → archive, more → export.
    expect(nodes.map((node) => node.id)).toEqual(['delete', 'more', 'archive', 'export']);
    expect(edges).toEqual([
      { source: Node.RootId, target: 'delete', relation: 'child' },
      { source: Node.RootId, target: 'more', relation: 'child' },
      { source: 'more', target: 'archive', relation: 'child' },
      { source: 'more', target: 'export', relation: 'child' },
    ]);
  });

  test('roots the actions at a supplied group', ({ expect }) => {
    const resolve = resolver({ event: [action('delete')] });
    const { edges } = buildGraphMenu(resolve, 'event', { rootId: 'overflow' });

    expect(edges).toEqual([{ source: 'overflow', target: 'delete', relation: 'child' }]);
  });

  test('filters actions by predicate', ({ expect }) => {
    const resolve = resolver({
      event: [action('delete', { disposition: 'menu' }), action('hidden', { disposition: 'item' })],
    });
    const { nodes } = buildGraphMenu(resolve, 'event', {
      filter: (node) => node.properties.disposition === 'menu',
    });

    expect(nodes.map((node) => node.id)).toEqual(['delete']);
  });

  test('keeps a shared action’s node once but records each edge, tolerating cycles', ({ expect }) => {
    // `more` references itself; the node is emitted once while both inbound edges survive.
    const resolve = resolver({
      event: [group('more')],
      more: [action('archive'), group('more')],
    });
    const { nodes, edges } = buildGraphMenu(resolve, 'event');

    expect(nodes.map((node) => node.id)).toEqual(['more', 'archive']);
    expect(edges).toEqual([
      { source: Node.RootId, target: 'more', relation: 'child' },
      { source: 'more', target: 'archive', relation: 'child' },
      { source: 'more', target: 'more', relation: 'child' },
    ]);
  });
});
