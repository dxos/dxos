//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type GraphModel, dynamicConstrain } from '@dxos/react-ui-canvas';
import { applyIntent } from '@dxos/scene';

import { toCanvasView } from './adapter.ts';
import { graphDocument, graphLayout, graphPositions, splitGraphEdit } from './graph.ts';

const GRAPH: GraphModel = {
  nodes: ['app', 'ui', 'model', 'store'].map((id) => ({ id, label: id })),
  edges: [
    ['app', 'ui'],
    ['app', 'model'],
    ['ui', 'model'],
    ['model', 'store'],
  ].map(([from, to]) => ({ id: `${from}->${to}`, from, to })),
};

const LATTICE = { width: 192, height: 96, gutterX: 64, gutterY: 64 };

describe('graphLayout', () => {
  test('a graph on a lattice is a dynamic layout with one shape per cell and a smart link per edge', ({ expect }) => {
    const layout = graphLayout(GRAPH, {
      lattice: LATTICE,
      shape: () => ({ type: 'card' }),
      link: { ends: { end: 'arrow' } },
    });
    expect(layout.lattice).toEqual(LATTICE);
    expect(layout.arrange).toEqual({ kind: 'dynamic', params: { arrange: 'crossings' } });
    const shapes = GRAPH.nodes.map(({ id }) => layout.elements[id]);
    for (const shape of shapes) {
      expect(shape?.type).toBe('card');
      expect(shape?.size).toEqual({ width: 192, height: 96 });
      // Every centre on a whole pitch, so each shape fills one cell.
      expect(Math.abs((shape?.center?.x ?? 0.5) % (192 + 64))).toBe(0);
      expect(Math.abs((shape?.center?.y ?? 0.5) % (96 + 64))).toBe(0);
    }
    expect(new Set(shapes.map((shape) => JSON.stringify(shape?.center))).size).toBe(shapes.length);
    // Ranked along the edges: the root above what it depends on.
    expect(layout.elements.app.center?.y).toBeLessThan(layout.elements.store.center?.y ?? 0);
    expect(layout.elements['app->ui']).toMatchObject({
      type: 'link',
      source: { node: 'app' },
      target: { node: 'ui' },
      props: { canvas: { type: 'smart', ends: { end: 'arrow' } } },
    });
  });

  test('the 2D viewport draws the host type and smart links', ({ expect }) => {
    const layout = graphLayout(GRAPH, { lattice: LATTICE, shape: () => ({ type: 'card' }) });
    const view = toCanvasView(graphDocument(layout), layout);
    expect(Object.values(view.nodes).map(({ type }) => type)).toEqual(['card', 'card', 'card', 'card']);
    expect(Object.values(view.links).map(({ type }) => type)).toEqual(['smart', 'smart', 'smart', 'smart']);
  });

  test("a host type's fields, layer and lock reach the node the viewport draws", ({ expect }) => {
    const layers = [
      { id: 'backdrop', name: 'Backdrop', z: 'a0' },
      { id: 'graph', name: 'Graph', z: 'a1' },
    ];
    const layout = graphLayout(GRAPH, {
      layers,
      shape: (node) =>
        node.id === 'app'
          ? { type: 'diagram', layer: 'backdrop', locked: true, label: 'App', fields: { heading: { id: 'title' } } }
          : { type: 'card', layer: 'graph' },
      link: { type: 'curve', layer: 'graph' },
    });
    const view = toCanvasView(graphDocument(layout), layout);
    expect(view.nodes.app).toMatchObject({
      type: 'diagram',
      layer: 'backdrop',
      locked: true,
      label: 'App',
      heading: { id: 'title' },
    });
    expect(view.links['app->ui']).toMatchObject({ type: 'curve', layer: 'graph' });
    expect(Object.keys(view.layers ?? {})).toEqual(['backdrop', 'graph']);
  });

  test('a placed node is pinned where it was placed, and the rest keep their slots', ({ expect }) => {
    const arranged = graphLayout(GRAPH, { lattice: LATTICE });
    const placed = graphLayout(GRAPH, { lattice: LATTICE }, { store: { x: 1024, y: 0 } });
    expect(placed.elements.store).toMatchObject({ center: { x: 1024, y: 0 }, pinned: true });
    expect(placed.elements.app.center).toEqual(arranged.elements.app.center);
    expect(placed.elements.app.pinned).toBeUndefined();
    expect(graphPositions(placed)).toEqual({ store: { x: 1024, y: 0 } });
  });

  test('a free force layout keeps the lattice sizes but no lattice', ({ expect }) => {
    const layout = graphLayout(GRAPH, { lattice: LATTICE, arrange: 'force-free' });
    expect(layout.lattice).toBeUndefined();
    expect(layout.elements.app.size).toEqual({ width: 192, height: 96 });
  });

  test('a move in the layout pins the shape it moved', ({ expect }) => {
    const layout = graphLayout(GRAPH, { lattice: LATTICE });
    const intent = dynamicConstrain(layout, { kind: 'update', id: 'ui', path: ['center'], value: { x: 512, y: 320 } });
    expect(intent).toBeDefined();
    const moved = intent ? applyIntent(layout, intent) : layout;
    expect(graphPositions(moved)).toEqual({ ui: { x: 512, y: 320 } });
  });
});

describe('splitGraphEdit', () => {
  const layout = graphLayout(GRAPH, { lattice: LATTICE });

  test('a deleted shape goes to the host with none of the links it took with it', () => {
    const edit = splitGraphEdit(layout, { kind: 'delete', ids: ['store', 'model->store'] });
    expect(edit).toEqual({ deleted: ['store'], linked: [] });
  });

  test('a link deleted on its own goes to the host', () => {
    expect(splitGraphEdit(layout, { kind: 'delete', ids: ['ui->model'] }).deleted).toEqual(['ui->model']);
  });

  test('a drawn link goes to the host and a move stays with the layout', () => {
    const move = { kind: 'update', id: 'ui', path: ['center'], value: { x: 0, y: 0 } } as const;
    const edit = splitGraphEdit(layout, {
      kind: 'batch',
      intents: [
        move,
        { kind: 'create', element: { id: 'new', type: 'link', source: { node: 'ui' }, target: { node: 'store' } } },
      ],
    });
    expect(edit).toEqual({ deleted: [], linked: [{ from: 'ui', to: 'store' }], rest: move });
  });
});
