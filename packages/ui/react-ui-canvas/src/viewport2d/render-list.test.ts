//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { DSL } from '@dxos/diagram';
import { EXEMPLAR_NAMES, EXEMPLARS } from '@dxos/diagram/testing';
import {
  LINK_PATHS,
  MAJOR_GRID,
  type Node,
  NODE_KINDS,
  type Scene,
  linkPath,
  readDocument,
  sidePort,
  toEcho,
} from '@dxos/scene';

import { type RenderList2D } from '../model/index.ts';
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
import { DEFAULT_LAYER, between } from '../utils/index.ts';
import { fromRenderList2D, namedStyles, styleClasses, toRenderList2D, toRenderLists2D } from './render-list.ts';

/** A board whose layout declares two layers and names a style on two elements. */
const DOCUMENT_2D: Scene.SceneDocument = (() => {
  const { document } = DSL.readScenes(`scene board dim=2d layout=board {
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

const views = (text: string) => toRenderLists2D(DSL.readScenes(text).document);

describe('toRenderLists2D', () => {
  test('maps a link naming no path to a smart link between the bound nodes', () => {
    const {
      lists: [root],
    } = views(EXEMPLARS.links);
    expect(root.links.ab).toMatchObject({
      kind: 'link',
      source: { node: 'a' },
      target: { node: 'b' },
      head: 'arrow',
    });
    expect(linkPath(root.links.ab)).toBe('smart');
    expect(root.nodes.a).toMatchObject({
      kind: 'rect',
      label: 'A',
      overrides: { color: 'blue', fill: 'solid', stroke: 'solid' },
    });
  });

  test("maps a composite element to a view node over its parts layout's view", () => {
    const { lists: all, root } = views(EXEMPLARS.subscene);
    expect(root).toBe('main');
    expect(all.find((view) => view.id === 'main')?.nodes.b).toMatchObject({ kind: 'view', scene: 'b-detail' });
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
          elements: { r: { id: 'r', kind: 'rect', center: { x: 10, y: 0 }, size: { width: 20, height: 20 } } },
        },
      ],
      models: [{ id: 'm', dim: '2d', objects: { box: { id: 'box', kind: 'rect', parts: 'inside' } } }],
    };
    const root = toRenderLists2D(document).lists.find((view) => view.id === 'root');
    // The parts span x 0..20, y -10..10; at scale 2 about the origin (100, 0) that is x 100..140, y -20..20.
    expect(root?.nodes.o).toMatchObject({
      kind: 'view',
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
    expect(written).not.toHaveProperty('frame');
  });

  test("an element placing an object draws with the object's kind and size", () => {
    const {
      lists: [root],
    } = views(EXEMPLARS.links);
    expect(root.nodes.b).toMatchObject({
      kind: 'rect',
      size: { width: 96, height: 96 },
      overrides: { color: 'green' },
    });
  });

  test('a .dx element keeps its layer and named style when its layout declares the layers', () => {
    const [root] = toRenderLists2D(DOCUMENT_2D).lists;
    expect(root.nodes.a).toMatchObject({ layer: 'diagram', style: 'primary' });
    expect(root.nodes.b).toMatchObject({ layer: 'diagram', style: 'accent' });
    expect(root.nodes.note).toMatchObject({ layer: 'background' });
    expect(Object.keys(root.layers ?? {})).toEqual(expect.arrayContaining(['background', 'diagram']));
  });

  test('an element in a layout that declares no layers is on the default layer, which the list declares', () => {
    const {
      lists: [root],
    } = views(EXEMPLARS.links);
    const layers = Object.keys(root.layers ?? {});
    expect(layers).toHaveLength(1);
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
          elements: { ab: { id: 'ab', kind: 'link', source: { node: 'a' }, target: { node: 'b' } } },
        },
      ],
      models: [],
    });
    expect(root.links).toEqual({});
  });

  test('puts every edge of every 2D exemplar node on a major grid line', () => {
    const offGrid = EXEMPLAR_NAMES.flatMap((name) =>
      toRenderLists2D(DSL.readScenes(EXEMPLARS[name]).document)
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

/** A node literal with its kind's own fields, which `Node` (the shared fields) does not list. */
const node = (fields: Node & Record<string, unknown>): Node => fields;
const box = { width: 128, height: 64 };

/** Every built-in node kind and link path, with the fields the sample trees leave out. */
const EVERY_KIND: RenderList2D = {
  id: 'every',
  name: 'Every kind',
  layers: { base: { id: 'base', name: 'Base', z: 'a0' }, top: { id: 'top', name: 'Top', z: 'a1', hidden: true } },
  nodes: {
    rect: node({ kind: 'rect', id: 'rect', z: 'a0', center: at, size: box, label: 'R', layer: 'top', locked: true }),
    ellipse: node({ kind: 'ellipse', id: 'ellipse', z: 'a1', center: at, size: box, rotation: 45 }),
    cloud: node({ kind: 'cloud', id: 'cloud', z: 'a2', center: at, size: box, params: { bumps: 7 } }),
    polygon: node({ kind: 'polygon', id: 'polygon', z: 'a3', center: at, size: box, params: { sides: 5 } }),
    shape: node({
      kind: 'shape',
      id: 'shape',
      z: 'a31',
      center: at,
      size: box,
      recipe: 'arrow',
      params: { head: 0.75 },
    }),
    polyline: node({ kind: 'polyline', id: 'polyline', z: 'a4', center: at, size: box, points: [at, { x: 1, y: 1 }] }),
    // With nothing inside it, so it keeps the frame it is given.
    hull: node({ kind: 'hull', id: 'hull', z: 'a41', center: at, size: box, shape: 'box' }),
    note: node({ kind: 'note', id: 'note', z: 'a5', center: at, size: box, label: 'Note' }),
    path: node({
      kind: 'path',
      id: 'path',
      z: 'a6',
      center: at,
      size: box,
      d: 'M0 0L1 1',
      viewBox: { x: 0, y: 0, ...box },
    }),
    generator: node({ kind: 'generator', id: 'generator', z: 'a8', center: at, size: box, generator: 'g', seed: 3 }),
    diagram: node({ kind: 'diagram', id: 'diagram', z: 'a9', center: at, size: box, label: 'D', element: 'process' }),
    styled: node({
      kind: 'rect',
      id: 'styled',
      z: 'a7',
      center: at,
      size: box,
      style: 'warning',
      ports: [sidePort('p', 'top', 0.5)],
      overrides: {
        color: 'red/1',
        opacity: 0.5,
        fill: 'none',
        stroke: 'solid',
        corners: 'all',
        guide: true,
        fontSize: 12,
        weight: 'l',
      },
      partOverrides: { title: { label: 'Own title' } },
    }),
  },
  links: {
    line: {
      kind: 'link',
      path: 'line',
      id: 'line',
      z: 'b0',
      source: { node: 'rect', port: 'out' },
      target: { node: 'ellipse' },
    },
    curve: {
      kind: 'link',
      path: 'curve',
      id: 'curve',
      z: 'b1',
      source: { node: 'rect' },
      target: { point: { x: 9, y: 9 } },
      tail: 'circle',
      head: 'crowsfoot',
      label: 'curve',
      overrides: { color: 'blue', stroke: 'dashed' },
    },
    spline: {
      kind: 'link',
      path: 'spline',
      id: 'spline',
      z: 'b2',
      source: { node: 'cloud' },
      target: { node: 'note' },
      points: [{ x: 3, y: 4 }],
    },
    smart: {
      kind: 'link',
      path: 'smart',
      id: 'smart',
      z: 'b3',
      source: { node: 'polygon' },
      target: { node: 'path' },
      style: 'c',
    },
    ortho: { kind: 'link', path: 'ortho', id: 'ortho', z: 'b4', source: { node: 'rect' }, target: { node: 'polygon' } },
    // A link naming no path takes the default, and reads back naming none.
    plain: { kind: 'link', id: 'plain', z: 'b5', source: { node: 'rect' }, target: { node: 'cloud' } },
  },
};

/** Every render list of the react-ui-canvas sample trees, and one of every node kind and link path. */
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
  EVERY_KIND,
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
  test('the corpus renders every node kind and link path', () => {
    const drawn = sampleViews().map(roundTrip);
    const nodeKinds = new Set(drawn.flatMap((list) => Object.values(list.nodes).map((node) => node.kind)));
    const linkPaths = new Set(drawn.flatMap((list) => Object.values(list.links).flatMap((link) => link.path ?? [])));
    expect([...nodeKinds].sort()).toEqual([...NODE_KINDS].sort());
    expect([...linkPaths].sort()).toEqual([...LINK_PATHS].sort());
    const every = roundTrip(EVERY_KIND);
    expect(Object.keys(every.nodes).length).toBe(Object.keys(EVERY_KIND.nodes).length);
    expect(Object.keys(every.links).length).toBe(Object.keys(EVERY_KIND.links).length);
  });
});

describe('fromRenderList2D', () => {
  test('round-trips every node kind and link path in the canvas samples', () => {
    for (const view of sampleViews()) {
      expect(roundTrip(view)).toEqual(view);
    }
  });

  test('style classes are the model styles, and a classed node reads back its own style, not the resolved look', () => {
    const classes = { warning: { id: 'warning', name: 'Warning', style: { color: 'red', fill: 'solid' as const } } };
    expect(styleClasses(namedStyles(classes))).toEqual(classes);
    const { layout } = fromRenderList2D(EVERY_KIND);
    const doc: Scene.SceneDocument = {
      scenes: [],
      layouts: [{ ...layout, model: 'm' }],
      models: [{ id: 'm', dim: '2d', objects: {}, styles: namedStyles(classes) }],
    };
    const styled = toRenderList2D(doc, { ...layout, model: 'm' }).nodes.styled;
    expect(styled).toEqual(EVERY_KIND.nodes.styled);
  });

  test('an element is the node or the link itself, with no bag of fields beside it', () => {
    const { layout } = fromRenderList2D(EVERY_KIND);
    expect(layout.elements.styled).toMatchObject({
      ports: [{ id: 'p', x: 0.5, y: 0, side: 'top' }],
      partOverrides: { title: { label: 'Own title' } },
    });
    expect(layout.elements.curve).toMatchObject({ kind: 'link', path: 'curve', tail: 'circle', head: 'crowsfoot' });
    expect(layout.elements.spline).toMatchObject({ path: 'spline', points: [{ x: 3, y: 4 }] });
    for (const element of Object.values(layout.elements)) {
      expect(element).not.toHaveProperty('props');
    }
    // A note's text and a link's caption are the element's label, and the named style and own look its own slots.
    expect(layout.elements.note).toMatchObject({ kind: 'note', label: 'Note' });
    expect(layout.elements.curve).toMatchObject({ label: 'curve', overrides: { color: 'blue', stroke: 'dashed' } });
    expect(layout.elements.smart.style).toBe('c');
    expect(layout.elements.styled.style).toBe('warning');
    expect(layout.elements.styled.overrides).toMatchObject({ guide: true });
  });

  test('keeps z and the link endpoints', () => {
    const { layout } = fromRenderList2D(EVERY_KIND);
    expect(layout.elements.rect.z).toBe('a0');
    expect(layout.elements.line).toMatchObject({ kind: 'link', source: { node: 'rect', port: 'out' } });
    expect(layout.elements.line.target).toEqual({ node: 'ellipse' });
    expect(layout.elements.styled.overrides).toMatchObject({ color: 'red/1', fill: 'none', stroke: 'solid' });
  });

  test('a view node places a composite object whose parts is the inner View', () => {
    const view = createNestedSimpleTree().views[0];
    const portal = Object.values(view.nodes).find((node) => node.kind === 'view');
    expect(portal).toBeDefined();
    const { layout, objects } = fromRenderList2D(view);
    const scene = portal && 'scene' in portal ? String(portal.scene) : '';
    expect(objects).toContainEqual({ id: `view:${scene}`, kind: 'rect', parts: scene });
    expect(portal && layout.elements[portal.id].object).toBe(`view:${scene}`);
  });

  test('two instance nodes of one composite place the same object', () => {
    const root = createObjectsTree().views.find((view) => view.id === 'scene:root');
    const { layout, objects } = fromRenderList2D(root ?? EVERY_KIND);
    expect(layout.elements['logo-1'].object).toBe('instance:logo');
    expect(objects.filter((object) => object.id === 'instance:logo')).toHaveLength(1);
  });

  test('a portal to a layout outside the drawing stays a portal, with its scene and link, through ECHO', () => {
    const portal = {
      kind: 'view',
      id: 'p',
      z: 'a0',
      center: { x: 0, y: 0 },
      size: { width: 128, height: 128 },
      // On its list's layer, as the editor makes a node: a list that declared none would read back with the default.
      layer: DEFAULT_LAYER.id,
      scene: 'other-drawing-view',
      link: { object: 'dxn:echo:@:other' },
    };
    const view: RenderList2D = {
      id: 'root',
      layers: { [DEFAULT_LAYER.id]: DEFAULT_LAYER },
      nodes: { p: portal },
      links: {},
    };
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

  test('a link whose stored colour is not a colour reads back without one', () => {
    const { layout } = fromRenderList2D({
      id: 'root',
      nodes: {
        a: { kind: 'rect', id: 'a', z: 'a0', center: { x: 0, y: 0 }, size: { width: 64, height: 64 } },
        b: { kind: 'rect', id: 'b', z: 'a1', center: { x: 128, y: 0 }, size: { width: 64, height: 64 } },
      },
      links: { ab: { kind: 'link', path: 'line', id: 'ab', z: 'a2', source: { node: 'a' }, target: { node: 'b' } } },
    });
    const withColor = (color: string): Scene.LayoutRecord2D => ({
      ...layout,
      elements: { ...layout.elements, ab: { ...layout.elements.ab, overrides: { color } } },
    });
    const read = (stored: Scene.LayoutRecord2D) =>
      toRenderList2D({ scenes: [], layouts: [stored], models: [] }, stored).links.ab;
    expect(read(withColor('Not A Colour')).overrides?.color).toBeUndefined();
    // Any colour a node takes is a link's too: a theme name, one at a tone, or a literal.
    expect(read(withColor('teal/2')).overrides?.color).toBe('teal/2');
    expect(read(withColor('#1e90ff')).overrides?.color).toBe('#1e90ff');
  });

  test('a .dx layout with one canvas-written element shows every element, hidden ones left out', () => {
    const { document } = DSL.readScenes(EXEMPLARS.links);
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
    expect(view.nodes.b.kind).toBe('rect');
  });
});
