//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Dsl } from '@dxos/diagram';
import { EXEMPLAR_NAMES, EXEMPLARS } from '@dxos/diagram/testing';
import { LINK_TYPES, MAJOR_GRID, type Node, NODE_TYPES, type Scene, readDocument, toEcho } from '@dxos/scene';

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
} from '../testing/index.ts';
import { between } from '../utils/index.ts';
import {
  type RenderList2D,
  fromRenderList2D,
  namedStyles,
  styleClasses,
  toRenderList2D,
  toRenderLists2D,
} from './render-list.ts';

/** A board whose layout declares two layers and names a style on two elements. */
const DOCUMENT_2D: Scene.SceneDocument = (() => {
  const { document } = Dsl.readScenes(`scene board dim=2d layout=board {
  camera center=0,0 zoom=1
}

layout board dim=2d model=shapes {
  element a box "A" @ 0,0 layer=diagram
  element b box "B" @ 256,0 layer=diagram
  element note rect "Note" @ 256,192 size=384x64 layer=background
  element ab link from=a to=b end=arrow
}

model shapes dim=2d {
  object box rect size=128x128
}
`);
  const background = { id: 'background', name: 'Background', z: between() };
  const diagram = { id: 'diagram', name: 'Diagram', z: between(background.z) };
  const styles: Readonly<Record<string, string>> = { a: 'primary', b: 'accent' };
  return {
    ...document,
    layouts: document.layouts.map((layout) =>
      layout.dim === '2d'
        ? {
            ...layout,
            layers: { background, diagram },
            elements: Object.fromEntries(
              Object.entries(layout.elements).map(([id, element]) => [
                id,
                styles[id] ? { ...element, style: styles[id] } : element,
              ]),
            ),
          }
        : layout,
    ),
  };
})();

const views = (text: string) => toRenderLists2D(Dsl.readScenes(text).document);

describe('toRenderLists2D', () => {
  test('maps a link naming no type to a smart link between the bound nodes', () => {
    const {
      lists: [root],
    } = views(EXEMPLARS.links);
    expect(root.links.ab).toMatchObject({
      type: 'smart',
      source: { node: 'a' },
      target: { node: 'b' },
      ends: { end: 'arrow' },
    });
    expect(root.nodes.a).toMatchObject({ type: 'rect', label: 'A', style: { hue: 'blue', fill: true, border: true } });
  });

  test("maps a composite element to a view node over its parts layout's view", () => {
    const { lists: all, root } = views(EXEMPLARS.subscene);
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
    const root = toRenderLists2D(document).lists.find((view) => view.id === 'root');
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
    const moved: RenderList2D | undefined =
      root && node ? { ...root, nodes: { ...root.nodes, o: { ...node, center: { x: 130, y: 0 } } } } : undefined;
    const written = moved && fromRenderList2D(moved).layout.elements.o;
    expect(written).toMatchObject({ center: { x: 110, y: 0 }, scale: { x: 2, y: 2 } });
    expect(written?.size).toBeUndefined();
    expect(written?.props?.canvas).not.toHaveProperty('frame');
  });

  test("an element placing an object draws with the object's kind and size", () => {
    const {
      lists: [root],
    } = views(EXEMPLARS.links);
    expect(root.nodes.b).toMatchObject({ type: 'rect', size: { width: 128, height: 128 }, style: { hue: 'green' } });
  });

  test('a .dx element keeps its layer and named style when its layout declares the layers', () => {
    const [root] = toRenderLists2D(DOCUMENT_2D).lists;
    expect(root.nodes.a).toMatchObject({ layer: 'diagram', class: 'primary' });
    expect(root.nodes.b).toMatchObject({ layer: 'diagram', class: 'accent' });
    expect(root.nodes.note).toMatchObject({ layer: 'background' });
    expect(Object.keys(root.layers ?? {})).toEqual(expect.arrayContaining(['background', 'diagram']));
  });

  test('an element on a layer its layout does not declare falls back to the default layer', () => {
    const {
      lists: [root],
    } = views(EXEMPLARS.links);
    const layers = Object.keys(root.layers ?? {});
    for (const node of Object.values(root.nodes)) {
      expect(layers).toContain(node.layer);
    }
  });

  test('skips a link whose binding is missing', () => {
    const {
      lists: [root],
    } = toRenderLists2D({
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

  test('puts every edge of every 2D exemplar node on a major grid line', () => {
    const offGrid = EXEMPLAR_NAMES.flatMap((name) =>
      toRenderLists2D(Dsl.readScenes(EXEMPLARS[name]).document)
        .lists.flatMap((view) => Object.values(view.nodes))
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
const EVERY_TYPE: RenderList2D = {
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
    generator: node({ type: 'generator', id: 'generator', z: 'a8', center: at, size: box, generator: 'g', seed: 3 }),
    diagram: node({ type: 'diagram', id: 'diagram', z: 'a9', center: at, size: box, label: 'D', element: 'process' }),
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

/** Every render list of the react-ui-canvas sample trees, and one of every node type and link shape. */
const sampleViews = (): RenderList2D[] => [
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

const roundTrip = (view: RenderList2D): RenderList2D => {
  const { layout, objects } = fromRenderList2D(view);
  const doc: Scene.SceneDocument = {
    scenes: [],
    layouts: [{ ...layout, model: 'm' }],
    models: [{ id: 'm', dim: '2d', objects: keyed(objects) }],
  };
  return toRenderList2D(doc, { ...layout, model: 'm' });
};

describe('toRenderList2D', () => {
  test('the corpus renders every node and link type', () => {
    const drawn = sampleViews().map(roundTrip);
    const nodeTypes = new Set(drawn.flatMap((list) => Object.values(list.nodes).map((node) => node.type)));
    const linkTypes = new Set(drawn.flatMap((list) => Object.values(list.links).map((link) => link.type)));
    expect([...nodeTypes].sort()).toEqual([...NODE_TYPES].sort());
    expect([...linkTypes].sort()).toEqual([...LINK_TYPES].sort());
    const every = roundTrip(EVERY_TYPE);
    expect(Object.keys(every.nodes).length).toBe(Object.keys(EVERY_TYPE.nodes).length);
    expect(Object.keys(every.links).length).toBe(Object.keys(EVERY_TYPE.links).length);
  });
});

describe('fromRenderList2D', () => {
  test('round-trips every node type and link shape in the canvas samples', () => {
    for (const view of sampleViews()) {
      expect(roundTrip(view)).toEqual(view);
    }
  });

  test('style classes are the model styles, and a classed node reads back its own style, not the resolved look', () => {
    const classes = { warning: { id: 'warning', name: 'Warning', style: { hue: 'red' as const, fill: true } } };
    expect(styleClasses(namedStyles(classes))).toEqual(classes);
    const { layout } = fromRenderList2D(EVERY_TYPE);
    const doc: Scene.SceneDocument = {
      scenes: [],
      layouts: [{ ...layout, model: 'm' }],
      models: [{ id: 'm', dim: '2d', objects: {}, styles: namedStyles(classes) }],
    };
    const styled = toRenderList2D(doc, { ...layout, model: 'm' }).nodes.styled;
    expect(styled).toEqual(EVERY_TYPE.nodes.styled);
  });

  test('keeps a node field Element2D has no slot for under props.canvas', () => {
    const { layout } = fromRenderList2D(EVERY_TYPE);
    expect(layout.elements.note.props?.canvas).toMatchObject({ text: 'Note' });
    expect(layout.elements.styled.style).toBe('warning');
    expect(layout.elements.styled.overrides).toMatchObject({ guide: true });
  });

  test('keeps z and the link endpoints', () => {
    const { layout } = fromRenderList2D(EVERY_TYPE);
    expect(layout.elements.rect.z).toBe('a0');
    expect(layout.elements.line).toMatchObject({ type: 'link', source: { node: 'rect', port: 'e' } });
    expect(layout.elements.line.target).toEqual({ node: 'ellipse' });
    expect(layout.elements.styled.overrides).toMatchObject({ hue: 'red', fill: false, border: true });
  });

  test('a view node places a composite object whose parts is the inner View', () => {
    const view = createNestedSimpleTree().views[0];
    const portal = Object.values(view.nodes).find((node) => node.type === 'view');
    expect(portal).toBeDefined();
    const { layout, objects } = fromRenderList2D(view);
    const scene = portal && 'scene' in portal ? String(portal.scene) : '';
    expect(objects).toContainEqual({ id: `view:${scene}`, type: 'rect', parts: scene });
    expect(portal && layout.elements[portal.id].object).toBe(`view:${scene}`);
  });

  test('two instance nodes of one composite place the same object', () => {
    const root = createObjectsTree().views.find((view) => view.id === 'scene:root');
    const { layout, objects } = fromRenderList2D(root ?? EVERY_TYPE);
    expect(layout.elements['logo-1'].object).toBe('instance:logo');
    expect(objects.filter((object) => object.id === 'instance:logo')).toHaveLength(1);
  });

  test('a portal to a layout outside the drawing stays a portal, with its scene and link, through ECHO', () => {
    const portal = {
      type: 'view',
      id: 'p',
      z: 'a0',
      center: { x: 0, y: 0 },
      size: { width: 128, height: 128 },
      scene: 'other-drawing-view',
      link: { object: 'dxn:echo:@:other' },
    };
    const view: RenderList2D = { id: 'root', nodes: { p: portal }, links: {} };
    const { layout, objects } = fromRenderList2D(view);
    const rootLayout: Scene.LayoutRecord2D = { ...layout, model: 'model' };
    const doc: Scene.SceneDocument = {
      scenes: [{ id: 'root', dim: '2d', layout: 'root', camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
      layouts: [rootLayout],
      models: [{ id: 'model', dim: '2d', objects: Object.fromEntries(objects.map((object) => [object.id, object])) }],
    };
    expect(toRenderList2D(doc, rootLayout).nodes.p).toEqual(portal);
    const stored = toEcho(doc);
    const back = readDocument({ scenes: [stored.root] });
    const backLayout = back.layouts[0];
    if (backLayout.dim !== '2d') {
      throw new Error('The layout read back is 2D.');
    }
    expect(toRenderList2D(back, backLayout).nodes.p).toEqual(portal);
  });

  test('a link whose stored hue is not a canvas hue reads back without one', () => {
    const { layout } = fromRenderList2D({
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
    expect(toRenderList2D(doc, bogus).links.ab.style?.hue).toBeUndefined();
  });

  test('a .dx layout with one canvas-written element shows every element, hidden ones left out', () => {
    const { document } = Dsl.readScenes(EXEMPLARS.links);
    const layout = document.layouts[0];
    if (layout.dim !== '2d') {
      throw new Error('links is a 2D exemplar.');
    }
    const written = toRenderList2D(document, layout);
    const { layout: rewritten } = fromRenderList2D(written);
    const mixed: Scene.LayoutRecord2D = {
      ...layout,
      elements: {
        ...layout.elements,
        a: { ...rewritten.elements.a, object: layout.elements.a.object },
        c: { ...layout.elements.c, hidden: true },
      },
    };
    const view = toRenderList2D({ ...document, layouts: [mixed] }, mixed);
    expect(Object.keys(view.nodes).sort()).toEqual(['a', 'b']);
    expect(Object.keys(view.links).sort()).toEqual(['ab']);
    expect(view.nodes.b.type).toBe('rect');
  });
});
