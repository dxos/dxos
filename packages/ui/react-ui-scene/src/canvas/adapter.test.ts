//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, expect, test } from 'vitest';

import { Dsl } from '@dxos/diagram';
import { EXEMPLAR_NAMES, EXEMPLARS } from '@dxos/diagram/testing';
import { MAJOR_GRID, type Node, type View, withLegacyView } from '@dxos/react-ui-canvas';
import {
  createLatticeTree,
  createLinkedPairTree,
  createModelViewTree,
  createNestedDeepTree,
  createNestedSimpleTree,
  createNestedViewTree,
  createObjectsTree,
  createSquareTree,
  createViewTree,
} from '@dxos/react-ui-canvas/testing';
import { type Scene } from '@dxos/scene';

import { fromCanvasView, toCanvasView, toCanvasViews } from './adapter.ts';

const views = (text: string) => toCanvasViews(Dsl.readScenes(text).document);

describe('toCanvasViews', () => {
  test('maps a link to a line link between the bound nodes', () => {
    const {
      views: [root],
    } = views(EXEMPLARS.links);
    expect(root.links.ab).toMatchObject({
      type: 'line',
      source: { node: 'a' },
      target: { node: 'b' },
      ends: { end: 'arrow' },
    });
    expect(root.nodes.a).toMatchObject({ type: 'rect', label: 'A', style: { hue: 'blue', fill: true, border: true } });
  });

  test("maps a composite element to a view node over its parts layout's view", () => {
    const { views: all, root } = views(EXEMPLARS.subscene);
    expect(root).toBe('main');
    expect(all.find((view) => view.id === 'main')?.nodes.b).toMatchObject({ type: 'view', scene: 'b-detail' });
    expect(all.map((view) => view.id)).toContain('b-detail');
  });

  test("an element placing an object draws with the object's kind and size", () => {
    const {
      views: [root],
    } = views(EXEMPLARS.links);
    expect(root.nodes.b).toMatchObject({ type: 'rect', size: { width: 128, height: 128 }, style: { hue: 'green' } });
  });

  test('skips a link whose binding is missing', () => {
    const {
      views: [root],
    } = toCanvasViews({
      scenes: [{ id: 's', dim: '2d', layout: 'l', camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
      layouts: [
        {
          id: 'l',
          dim: '2d',
          elements: { ab: { id: 'ab', kind: 'link', from: { element: 'a' }, to: { element: 'b' } } },
        },
      ],
      models: [],
    });
    expect(root.links).toEqual({});
  });

  test('makes a store the canvas reads', () => {
    const { store, root } = views(EXEMPLARS.links);
    expect(Registry.make().get(store.view(root))?.nodes.c).toBeDefined();
  });

  test('puts every edge of every 2D exemplar node on a major grid line', () => {
    const offGrid = EXEMPLAR_NAMES.flatMap((name) =>
      toCanvasViews(Dsl.readScenes(EXEMPLARS[name]).document)
        .views.flatMap((view) => Object.values(view.nodes))
        .filter((node) =>
          [
            node.center.x - node.size.width / 2,
            node.center.x + node.size.width / 2,
            node.center.y - node.size.height / 2,
            node.center.y + node.size.height / 2,
          ].some((edge) => edge % MAJOR_GRID !== 0),
        )
        .map((node) => `${name}/${node.id}`),
    );
    expect(offGrid).toEqual([]);
  });
});

const at = { x: 0, y: 0 };

/** A node literal with its type's own fields, which `Node` (the shared fields) does not list. */
const node = (fields: Node & Record<string, unknown>): Node => fields;
const box = { width: 128, height: 64 };

/** Every built-in node type and link shape, with the fields the sample trees leave out. */
const EVERY_TYPE: View = {
  id: 'every',
  name: 'Every type',
  layers: { base: { id: 'base', name: 'Base', z: 'a0' }, top: { id: 'top', name: 'Top', z: 'a1', hidden: true } },
  nodes: {
    rect: node({ type: 'rect', id: 'rect', z: 'a0', center: at, size: box, label: 'R', layer: 'top', locked: true }),
    ellipse: node({ type: 'ellipse', id: 'ellipse', z: 'a1', center: at, size: box, rotation: 45 }),
    cloud: node({ type: 'cloud', id: 'cloud', z: 'a2', center: at, size: box, params: { bumps: 7 } }),
    polygon: node({ type: 'polygon', id: 'polygon', z: 'a3', center: at, size: box, params: { sides: 5 } }),
    polyline: node({ type: 'polyline', id: 'polyline', z: 'a4', center: at, size: box, points: [at, { x: 1, y: 1 }] }),
    note: node({ type: 'note', id: 'note', z: 'a5', center: at, size: box, text: 'Note' }),
    path: node({
      type: 'path',
      id: 'path',
      z: 'a6',
      center: at,
      size: box,
      d: 'M0 0L1 1',
      viewBox: { x: 0, y: 0, ...box },
    }),
    styled: node({
      type: 'rect',
      id: 'styled',
      z: 'a7',
      center: at,
      size: box,
      class: 'warning',
      ports: [{ id: 'p', side: 'n', offset: 0.5 }],
      style: { hue: 'red', tone: 1, opacity: 0.5, fill: false, border: true, rounded: true, guide: true, fontSize: 12 },
    }),
  },
  links: {
    line: { type: 'line', id: 'line', z: 'b0', source: { node: 'rect', port: 'e' }, target: { node: 'ellipse' } },
    curve: {
      type: 'curve',
      id: 'curve',
      z: 'b1',
      source: { node: 'rect' },
      target: { point: { x: 9, y: 9 } },
      ends: { start: 'circle', end: 'arrow' },
      text: 'curve',
      style: { hue: 'blue', lineStyle: 'dashed' },
    },
    spline: {
      type: 'spline',
      id: 'spline',
      z: 'b2',
      source: { node: 'cloud' },
      target: { node: 'note' },
      points: [{ x: 3, y: 4 }],
    },
    smart: { type: 'smart', id: 'smart', z: 'b3', source: { node: 'polygon' }, target: { node: 'path' }, class: 'c' },
  },
};

/** Every View of the react-ui-canvas sample trees, and one of every node type and link shape. */
const sampleViews = (): View[] => [
  ...[
    createSquareTree(),
    createLatticeTree(),
    createNestedDeepTree(),
    createLinkedPairTree(),
    createNestedSimpleTree(),
    createNestedViewTree(),
    createObjectsTree(),
    createModelViewTree(),
    createViewTree(2),
  ].flatMap((tree) => tree.views),
  EVERY_TYPE,
];

const keyed = (objects: readonly Scene.Object2D[]) => Object.fromEntries(objects.map((object) => [object.id, object]));

const roundTrip = (view: View): View => {
  const { layout, objects } = fromCanvasView(view);
  const doc: Scene.SceneDocument = {
    scenes: [],
    layouts: [{ ...layout, model: 'm' }],
    models: [{ id: 'm', dim: '2d', objects: keyed(objects) }],
  };
  return toCanvasView(doc, { ...layout, model: 'm' });
};

describe('fromCanvasView', () => {
  test('round-trips every node type and link shape in the canvas samples', () => {
    for (const view of sampleViews()) {
      expect(roundTrip(view)).toEqual(withLegacyView(view));
    }
  });

  test('keeps a node field Element2D has no slot for under props.canvas', () => {
    const { layout } = fromCanvasView(EVERY_TYPE);
    expect(layout.elements.note.props?.canvas).toMatchObject({ text: 'Note' });
    expect(layout.elements.styled.props?.canvas).toMatchObject({ class: 'warning', style: { guide: true } });
  });

  test('maps z to order and a link endpoint to a binding', () => {
    const { layout } = fromCanvasView(EVERY_TYPE);
    expect(layout.elements.rect.order).toBe('a0');
    expect(layout.elements.line).toMatchObject({ kind: 'link', from: { element: 'rect', anchor: 'e' } });
    expect(layout.elements.line.to).toEqual({ element: 'ellipse' });
    expect(layout.elements.styled.style).toMatchObject({ hue: 'red', surface: 'none', border: true });
  });

  test('a view node places a composite object whose parts is the inner View', () => {
    const view = createNestedSimpleTree().views[0];
    const portal = Object.values(view.nodes).find((node) => node.type === 'view');
    expect(portal).toBeDefined();
    const { layout, objects } = fromCanvasView(view);
    const scene = portal && 'scene' in portal ? String(portal.scene) : '';
    expect(objects).toContainEqual({ id: `view:${scene}`, kind: 'rect', parts: scene });
    expect(portal && layout.elements[portal.id].object).toBe(`view:${scene}`);
  });

  test('two instance nodes of one composite place the same object', () => {
    const root = createObjectsTree().views.find((view) => view.id === 'scene:root');
    const { layout, objects } = fromCanvasView(root ?? EVERY_TYPE);
    expect(layout.elements['logo-1'].object).toBe('instance:logo');
    expect(objects.filter((object) => object.id === 'instance:logo')).toHaveLength(1);
  });
});
