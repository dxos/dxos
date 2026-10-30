//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, expect, test } from 'vitest';

import { Dsl } from '@dxos/diagram';
import { EXEMPLAR_NAMES, EXEMPLARS } from '@dxos/diagram/testing';
import { type View, withLegacyView } from '@dxos/react-ui-canvas';
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
import { MAJOR_GRID, type Node, type Scene, readDocument, toEcho } from '@dxos/scene';

import { fromCanvasView, namedStyles, styleClasses, toCanvasView, toCanvasViews } from './adapter.ts';

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

  test('a placed composite with a scale draws its parts at that scale about its origin, as decision 18 places them', () => {
    const document: Scene.SceneDocument = {
      scenes: [{ id: 's', dim: '2d', layout: 'root', camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
      layouts: [
        {
          id: 'root',
          dim: '2d',
          model: 'm',
          elements: { o: { id: 'o', object: 'box', center: { x: 100, y: 0 }, scale: { x: 2, y: 2 } } },
        },
        {
          id: 'inside',
          dim: '2d',
          elements: { r: { id: 'r', type: 'rect', center: { x: 10, y: 0 }, size: { width: 20, height: 20 } } },
        },
      ],
      models: [{ id: 'm', dim: '2d', objects: { box: { id: 'box', type: 'rect', parts: 'inside' } } }],
    };
    const root = toCanvasViews(document).views.find((view) => view.id === 'root');
    // The parts span x 0..20, y -10..10; at scale 2 about the origin (100, 0) that is x 100..140, y -20..20.
    expect(root?.nodes.o).toMatchObject({
      type: 'view',
      scene: 'inside',
      center: { x: 120, y: 0 },
      size: { width: 40, height: 40 },
      frame: { x: 0, y: -10, width: 20, height: 20 },
    });

    // Moved on the canvas, it writes its origin and keeps its scale; the box and region are read from the parts.
    const node = root?.nodes.o;
    const moved: View | undefined =
      root && node ? { ...root, nodes: { ...root.nodes, o: { ...node, center: { x: 130, y: 0 } } } } : undefined;
    const written = moved && fromCanvasView(moved).layout.elements.o;
    expect(written).toMatchObject({ center: { x: 110, y: 0 }, scale: { x: 2, y: 2 } });
    expect(written?.size).toBeUndefined();
    expect(written?.props?.canvas).not.toHaveProperty('frame');
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
          elements: { ab: { id: 'ab', type: 'link', source: { node: 'a' }, target: { node: 'b' } } },
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

  test('style classes are the model styles, and a classed node reads back its own style, not the resolved look', () => {
    const classes = { warning: { id: 'warning', name: 'Warning', style: { hue: 'red' as const, fill: true } } };
    expect(styleClasses(namedStyles(classes))).toEqual(classes);
    const { layout } = fromCanvasView(EVERY_TYPE);
    const doc: Scene.SceneDocument = {
      scenes: [],
      layouts: [{ ...layout, model: 'm' }],
      models: [{ id: 'm', dim: '2d', objects: {}, styles: namedStyles(classes) }],
    };
    const styled = toCanvasView(doc, { ...layout, model: 'm' }).nodes.styled;
    expect(styled).toEqual(EVERY_TYPE.nodes.styled);
  });

  test('keeps a node field Element2D has no slot for under props.canvas', () => {
    const { layout } = fromCanvasView(EVERY_TYPE);
    expect(layout.elements.note.props?.canvas).toMatchObject({ text: 'Note' });
    expect(layout.elements.styled.style).toBe('warning');
    expect(layout.elements.styled.overrides).toMatchObject({ guide: true });
  });

  test('keeps z and the link endpoints', () => {
    const { layout } = fromCanvasView(EVERY_TYPE);
    expect(layout.elements.rect.z).toBe('a0');
    expect(layout.elements.line).toMatchObject({ type: 'link', source: { node: 'rect', port: 'e' } });
    expect(layout.elements.line.target).toEqual({ node: 'ellipse' });
    expect(layout.elements.styled.overrides).toMatchObject({ hue: 'red', fill: false, border: true });
  });

  test('a view node places a composite object whose parts is the inner View', () => {
    const view = createNestedSimpleTree().views[0];
    const portal = Object.values(view.nodes).find((node) => node.type === 'view');
    expect(portal).toBeDefined();
    const { layout, objects } = fromCanvasView(view);
    const scene = portal && 'scene' in portal ? String(portal.scene) : '';
    expect(objects).toContainEqual({ id: `view:${scene}`, type: 'rect', parts: scene });
    expect(portal && layout.elements[portal.id].object).toBe(`view:${scene}`);
  });

  test('two instance nodes of one composite place the same object', () => {
    const root = createObjectsTree().views.find((view) => view.id === 'scene:root');
    const { layout, objects } = fromCanvasView(root ?? EVERY_TYPE);
    expect(layout.elements['logo-1'].object).toBe('instance:logo');
    expect(objects.filter((object) => object.id === 'instance:logo')).toHaveLength(1);
  });

  test('a portal to a View outside the drawing stays a portal, with its scene and link, through ECHO', () => {
    const portal = {
      type: 'view',
      id: 'p',
      z: 'a0',
      center: { x: 0, y: 0 },
      size: { width: 128, height: 128 },
      scene: 'other-drawing-view',
      link: { object: 'dxn:echo:@:other' },
    };
    const view: View = { id: 'root', nodes: { p: portal }, links: {} };
    const { layout, objects } = fromCanvasView(view);
    const rootLayout: Scene.LayoutRecord2D = { ...layout, model: 'model' };
    const doc: Scene.SceneDocument = {
      scenes: [{ id: 'root', dim: '2d', layout: 'root', camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
      layouts: [rootLayout],
      models: [{ id: 'model', dim: '2d', objects: Object.fromEntries(objects.map((object) => [object.id, object])) }],
    };
    expect(toCanvasView(doc, rootLayout).nodes.p).toEqual(portal);
    const stored = toEcho(doc);
    const back = readDocument({ scenes: [stored.root] });
    const backLayout = back.layouts[0];
    if (backLayout.dim !== '2d') {
      throw new Error('The layout read back is 2D.');
    }
    expect(toCanvasView(back, backLayout).nodes.p).toEqual(portal);
  });

  test('a link whose stored hue is not a canvas hue reads back without one', () => {
    const { layout } = fromCanvasView({
      id: 'root',
      nodes: {
        a: { type: 'rect', id: 'a', z: 'a0', center: { x: 0, y: 0 }, size: { width: 64, height: 64 } },
        b: { type: 'rect', id: 'b', z: 'a1', center: { x: 128, y: 0 }, size: { width: 64, height: 64 } },
      },
      links: { ab: { type: 'line', id: 'ab', z: 'a2', source: { node: 'a' }, target: { node: 'b' } } },
    });
    const bogus = {
      ...layout,
      elements: { ...layout.elements, ab: { ...layout.elements.ab, overrides: { hue: 'bogus' } } },
    };
    const doc: Scene.SceneDocument = { scenes: [], layouts: [bogus], models: [] };
    expect(toCanvasView(doc, bogus).links.ab.style?.hue).toBeUndefined();
  });

  test('a .dx layout with one canvas-written element shows every element, hidden ones left out', () => {
    const { document } = Dsl.readScenes(EXEMPLARS.links);
    const layout = document.layouts[0];
    if (layout.dim !== '2d') {
      throw new Error('links is a 2D exemplar.');
    }
    const written = toCanvasView(document, layout);
    const { layout: rewritten } = fromCanvasView(written);
    const mixed: Scene.LayoutRecord2D = {
      ...layout,
      elements: {
        ...layout.elements,
        a: { ...rewritten.elements.a, object: layout.elements.a.object },
        c: { ...layout.elements.c, hidden: true },
      },
    };
    const view = toCanvasView({ ...document, layouts: [mixed] }, mixed);
    expect(Object.keys(view.nodes).sort()).toEqual(['a', 'b']);
    expect(Object.keys(view.links).sort()).toEqual(['ab']);
    expect(view.nodes.b.type).toBe('rect');
  });
});
