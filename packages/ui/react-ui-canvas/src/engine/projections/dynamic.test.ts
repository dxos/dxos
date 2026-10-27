//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { defaultNodeRegistry } from '../../components/index.ts';
import { type View, patchSource, recordChanges } from '../../model/index.ts';
import { type GraphModel, type Overlay, createDynamicProjection, layoutGraph, pruneOverlay } from './dynamic.ts';

const graph: GraphModel = {
  nodes: [{ id: 'root' }, { id: 'left' }, { id: 'right' }, { id: 'leaf' }],
  edges: [
    { id: 'e1', from: 'root', to: 'left' },
    { id: 'e2', from: 'root', to: 'right' },
    { id: 'e3', from: 'left', to: 'leaf' },
  ],
};

const centerOf = (scene: View, id: string) => {
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

  test('a host declares layers, so a backdrop node paints under the links', ({ expect }) => {
    const scene = layoutGraph(
      graph,
      { positions: {} },
      {
        nodes: defaultNodeRegistry,
        layers: [
          { id: 'backdrop', name: 'Backdrop', z: 'a0' },
          { id: 'graph', name: 'Graph', z: 'a1' },
        ],
        link: { layer: 'graph' },
        createNode: (node, props) => ({
          type: 'rect',
          ...props,
          layer: node.id === 'root' ? 'backdrop' : 'graph',
        }),
      },
    );
    expect(Object.keys(scene.layers ?? {}).sort()).toEqual(['backdrop', 'graph']);
    expect(Object.values(scene.links).every(({ layer }) => layer === 'graph')).toBe(true);
    expect(scene.nodes.root?.layer).toBe('backdrop');
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

    const styled = layoutGraph(
      {
        ...graph,
        edges: [{ id: 'e1', from: 'root', to: 'left', text: 'uses', ends: { start: 'arrow' }, style: { hue: 'red' } }],
      },
      { positions: {} },
      { nodes: defaultNodeRegistry, link: { ends: { end: 'arrow' } } },
    );
    expect(styled.links.e1).toMatchObject({ text: 'uses', ends: { start: 'arrow' }, style: { hue: 'red' } });

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
    const overlay = Atom.keepAlive(Atom.make<Overlay>({ positions: {} }));
    const linked: { from: string; to: string }[] = [];
    const deleted: (readonly string[])[] = [];
    const projection = createDynamicProjection({
      registry,
      graph: model,
      overlay,
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

    // Undo patches the overrides back but leaves the host's graph as its model last set it: the graph is not versioned.
    const { model: versions } = projection;
    const [change] = versions
      ? recordChanges([versions], () => {
          registry.set(model, { ...graph, edges: graph.edges.filter(({ id }) => id !== 'e1') });
          projection.apply({ kind: 'move', ids: ['leaf'], delta: { x: 10, y: 0 } });
        })
      : [];
    expect(change?.paths).toEqual([['overlay', 'positions', 'leaf']]);
    const hostGraph = registry.get(model);
    if (versions && change) {
      patchSource(versions, { from: change.after, to: change.before, paths: change.paths });
    }
    expect(registry.get(overlay).positions).toEqual({});
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

  test('on a lattice, nodes sit one per cell and a move lands on a free cell', ({ expect }) => {
    const spec = { width: 256, height: 128, gutterX: 128, gutterY: 64 };
    const registry = Registry.make();
    const overlay = Atom.make<Overlay>({ positions: {} });
    const projection = createDynamicProjection({
      registry,
      graph: Atom.make(graph),
      overlay,
      options: { nodes: defaultNodeRegistry, lattice: spec },
    });
    expect(projection.lattice).toEqual(spec);
    const scene = registry.get(projection.scene);
    for (const node of Object.values(scene.nodes)) {
      expect(node.size).toEqual({ width: 256, height: 128 });
      expect(Math.abs(node.center.x % 384)).toBe(0);
      expect(Math.abs(node.center.y % 192)).toBe(0);
    }

    const leaf = centerOf(scene, 'leaf');
    projection.apply({ kind: 'move', ids: ['leaf'], delta: { x: 400, y: 10 } });
    expect(registry.get(overlay).positions.leaf).toEqual({ x: leaf.x + 384, y: leaf.y });

    // The cell under the root is taken, so the move is refused.
    const root = centerOf(registry.get(projection.scene), 'root');
    const left = centerOf(registry.get(projection.scene), 'left');
    projection.apply({ kind: 'move', ids: ['left'], delta: { x: root.x - left.x, y: root.y - left.y } });
    expect(registry.get(overlay).positions.left).toBeUndefined();
  });

  test('a free force layout keeps the lattice sizes but neither snaps nor routes on it', ({ expect }) => {
    const spec = { width: 256, height: 128, gutterX: 128, gutterY: 64 };
    const registry = Registry.make();
    const projection = createDynamicProjection({
      registry,
      graph: Atom.make(graph),
      overlay: Atom.make<Overlay>({ positions: {} }),
      options: { nodes: defaultNodeRegistry, lattice: spec, arrange: 'force-free' },
    });
    expect(projection.lattice).toBeUndefined();
    expect(projection.constrain).toBeUndefined();
    expect(registry.get(projection.scene).nodes.root.size).toEqual({ width: 256, height: 128 });
  });
});
