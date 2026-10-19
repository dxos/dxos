//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { defaultNodeRegistry } from '../../components/SceneLayer/index.ts';
import { type Scene } from '../../model/index.ts';
import { type GraphModel, type Overlay, createDynamicProjection, layoutGraph, pruneOverlay } from './dynamic.ts';

const graph: GraphModel = {
  nodes: [{ id: 'root' }, { id: 'left' }, { id: 'right' }, { id: 'leaf' }],
  edges: [
    { id: 'e1', from: 'root', to: 'left' },
    { id: 'e2', from: 'root', to: 'right' },
    { id: 'e3', from: 'left', to: 'leaf' },
  ],
};

const centerOf = (scene: Scene, id: string) => {
  const node = scene.nodes[id];
  if (!node) {
    throw new Error(`no node ${id}`);
  }
  return node.center;
};

describe('dynamic projection', () => {
  test('layoutGraph ranks rows along the edges and emits links', ({ expect }) => {
    const scene = layoutGraph(graph, { positions: {} }, { nodes: defaultNodeRegistry });
    expect(centerOf(scene, 'left').y).toBeGreaterThan(centerOf(scene, 'root').y);
    expect(centerOf(scene, 'leaf').y).toBeGreaterThan(centerOf(scene, 'left').y);
    expect(centerOf(scene, 'left').y).toBe(centerOf(scene, 'right').y);
    expect(centerOf(scene, 'left').x).not.toBe(centerOf(scene, 'right').x);
    expect(Object.keys(scene.links).length).toBe(3);
  });

  test('a host supplies the node type, link style and capabilities', ({ expect }) => {
    const scene = layoutGraph(
      graph,
      { positions: {} },
      {
        nodes: defaultNodeRegistry,
        createNode: (node, props) => ({ type: 'card', ...props, label: node.id }),
        link: { type: 'line', ends: { end: 'arrow' } },
      },
    );
    expect(scene.nodes.root).toMatchObject({ type: 'card', label: 'root' });
    expect(scene.links.e1).toMatchObject({ type: 'line', ends: { end: 'arrow' } });

    const registry = Registry.make();
    const projection = createDynamicProjection({
      registry,
      graph: Atom.make(graph),
      overlay: Atom.make<Overlay>({ positions: {} }),
      options: { nodes: defaultNodeRegistry },
      capabilities: { move: true },
    });
    expect(projection.capabilities).toEqual({ move: true });
  });

  test('a host intercepts link and delete intents and the graph is left to follow its model', ({ expect }) => {
    const registry = Registry.make();
    const model = Atom.make(graph);
    const linked: { from: string; to: string }[] = [];
    const deleted: (readonly string[])[] = [];
    const projection = createDynamicProjection({
      registry,
      graph: model,
      overlay: Atom.make<Overlay>({ positions: {} }),
      options: { nodes: defaultNodeRegistry },
      onLink: (edge) => linked.push(edge),
      onDelete: (ids) => deleted.push(ids),
    });
    projection.apply({
      kind: 'link',
      link: { type: 'line', id: 'new', z: 'a0', source: { node: 'right' }, target: { node: 'leaf' } },
    });
    projection.apply({ kind: 'delete', ids: ['e1'] });
    expect(linked).toEqual([{ from: 'right', to: 'leaf' }]);
    expect(deleted).toEqual([['e1']]);
    expect(registry.get(model)).toBe(graph);

    // Undo restores the overrides but leaves the host's graph as its model last set it.
    const before = projection.snapshot?.();
    const hostGraph = { ...graph, edges: graph.edges.filter(({ id }) => id !== 'e1') };
    registry.set(model, hostGraph);
    projection.restore?.(before);
    expect(registry.get(model)).toBe(hostGraph);
  });

  test('an override wins over the engine and survives an unrelated graph change', ({ expect }) => {
    const registry = Registry.make();
    const graphAtom = Atom.keepAlive(Atom.make<GraphModel>(graph));
    const overlayAtom = Atom.keepAlive(Atom.make<Overlay>({ positions: {} }));
    const projection = createDynamicProjection({
      registry,
      graph: graphAtom,
      overlay: overlayAtom,
      options: { nodes: defaultNodeRegistry },
    });
    const before = centerOf(registry.get(projection.scene), 'right');
    projection.apply({ kind: 'move', ids: ['right'], delta: { x: 500, y: 0 } });
    expect(centerOf(registry.get(projection.scene), 'right')).toEqual({ x: before.x + 500, y: before.y });

    registry.set(graphAtom, { ...graph, nodes: [...graph.nodes, { id: 'extra' }] });
    expect(centerOf(registry.get(projection.scene), 'right')).toEqual({ x: before.x + 500, y: before.y });
    expect(registry.get(projection.scene).nodes.extra).toBeDefined();
  });

  test('an override is dropped when its node goes', ({ expect }) => {
    const overlay: Overlay = { positions: { right: { x: 1, y: 1 }, gone: { x: 2, y: 2 } } };
    expect(pruneOverlay(graph, overlay)).toEqual({ positions: { right: { x: 1, y: 1 } } });
    expect(pruneOverlay(graph, { positions: { right: { x: 1, y: 1 } } })).toEqual({
      positions: { right: { x: 1, y: 1 } },
    });
  });

  test('link adds an edge and delete removes a node with its edges', ({ expect }) => {
    const registry = Registry.make();
    const graphAtom = Atom.keepAlive(Atom.make<GraphModel>(graph));
    const overlayAtom = Atom.keepAlive(Atom.make<Overlay>({ positions: {} }));
    const projection = createDynamicProjection({
      registry,
      graph: graphAtom,
      overlay: overlayAtom,
      options: { nodes: defaultNodeRegistry },
    });
    projection.apply({
      kind: 'link',
      link: { type: 'curve', id: 'e4', z: 'z', source: { node: 'right' }, target: { node: 'leaf' } },
    });
    expect(registry.get(graphAtom).edges.map(({ id }) => id)).toEqual(['e1', 'e2', 'e3', 'e4']);
    projection.apply({ kind: 'delete', ids: ['left'] });
    expect(registry.get(graphAtom).nodes.map(({ id }) => id)).toEqual(['root', 'right', 'leaf']);
    expect(registry.get(graphAtom).edges.map(({ id }) => id)).toEqual(['e2', 'e4']);
  });
});
