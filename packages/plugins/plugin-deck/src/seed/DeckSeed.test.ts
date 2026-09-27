//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as DeckSpec from '@dxos/app-toolkit/DeckSpec';

import * as DeckSeed from './DeckSeed.ts';

/** A collection that seeds its deck, holding `count` documents. */
const setup = (count: number, initial: DeckSpec.DeckSpec['initial'] = 'children') => {
  const graph = AppGraph.make({ registry: Registry.make() });
  AppGraph.addNode(graph, { id: 'root/c', type: 'test', properties: { [DeckSpec.DECK_SPEC_PROPERTY]: { initial } } });
  const children = Array.from({ length: count }, (_, index) => `root/c/${index}`);
  for (const id of children) {
    AppGraph.addNode(graph, { id, type: 'test', data: {} });
    AppGraph.addEdge(graph, { source: 'root/c', target: id, relation: 'child' });
  }
  return { graph, children };
};

describe('DeckSeed.sourceOf', () => {
  test('names the collection when the deck is exactly its seed', ({ expect }) => {
    const { graph, children } = setup(3);
    expect(DeckSeed.sourceOf(graph, children)).toBe('root/c');
  });

  test('a large collection seeds only its first planks, and that is still its seed', ({ expect }) => {
    const { graph, children } = setup(12);
    expect(DeckSeed.sourceOf(graph, children.slice(0, 8))).toBe('root/c');
  });

  test('one document of the collection opened on its own is not the seed', ({ expect }) => {
    const { graph, children } = setup(3);
    expect(DeckSeed.sourceOf(graph, [children[1]])).toBeUndefined();
  });

  test('a parent that does not seed its deck is never the source', ({ expect }) => {
    const { graph, children } = setup(3, 'none');
    expect(DeckSeed.sourceOf(graph, children)).toBeUndefined();
  });
});
