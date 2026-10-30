//
// Copyright 2026 DXOS.org
//

// Hierarchical drawings shared by the canvas's stories and tests: one square, a lattice, nested views shallow and deep,
// a labelled frame, and objects placed across views.

import { type InstanceNode, MAJOR_GRID, type ViewId } from '@dxos/scene';

import { type Box, ViewBuilder, type ViewTree } from '../builder/index.ts';
import { type Node, type View } from '../model/index.ts';
import { DEFAULT_LATTICE, DEFAULT_SHAPE_SIZE, TONES, cellBounds } from '../utils/index.ts';

/**
 * A square centred on the origin, with an unlabelled circle to its left and polygon to its right: something to
 * select and style straight away.
 */
export const createSquareTree = () => {
  const root = 'scene:root';
  // One major grid cell between neighbours.
  const step = DEFAULT_SHAPE_SIZE.width + MAJOR_GRID;
  const at = (offset: number) => ({
    x: offset - DEFAULT_SHAPE_SIZE.width / 2,
    y: -DEFAULT_SHAPE_SIZE.height / 2,
    ...DEFAULT_SHAPE_SIZE,
  });
  return ViewBuilder.view(root, [
    ViewBuilder.rect('square', at(0)).properties({ label: 'A' }),
    ViewBuilder.ellipse('circle', at(-step)),
    ViewBuilder.polygon('polygon', at(step)),
  ])
    .name('root')
    .build();
};

/**
 * Shapes on the default lattice, three columns by three rows around the origin: A, B, C down the first
 * column; D and E below a free cell in the second; F, a scene of its own with four ports a side, spanning
 * the top two rows of the third. Linked through the gutters, two of the links sharing gutters to show the lanes.
 */
export const createLatticeTree = () => {
  const root = 'scene:root';
  const at = (col: number, row: number, spanX = 1, spanY = 1) =>
    cellBounds({ col, row, spanX, spanY }, DEFAULT_LATTICE);
  const box = (id: string, cell: Box, label: string) => ViewBuilder.rect(id, cell).properties({ label });
  const smart = (from: string, to: string) => ViewBuilder.link('smart', from, to);
  return ViewBuilder.view(root, [
    ...[box('a', at(-1, -1), 'A'), box('b', at(-1, 0), 'B'), box('c', at(-1, 1), 'C')].map((element) =>
      element.properties({ style: { hue: 'neutral' } }),
    ),
    box('d', at(0, 0), 'D').properties({ style: { hue: 'green', tone: 3 } }),
    box('e', at(0, 1), 'E').properties({ style: { hue: 'green', tone: 1 } }),
    // Unlabelled, so the scene shows its contents.
    ViewBuilder.view('f', [
      // One hue at each of its tones: outline, then strongest to lightest.
      ...TONES.map((tone, index) =>
        box(`f${index + 1}`, at(0, index - 1), `F${index + 1}`).properties({ style: { hue: 'blue', tone } }),
      ),
      smart('f1', 'f2'),
      smart('f2', 'f3'),
      smart('f3', 'f4'),
    ])
      .name('F')
      .at(at(1, -1, 1, 2))
      .properties({ style: { hue: 'blue' }, portsPerSide: 4 }),
    smart('a', 'b'),
    smart('b', 'c'),
    smart('b', 'd'),
    smart('d', 'e'),
    smart('d', 'f'),
    // Two links that share the column gutter between B and D and the row gutter above E: they run in
    // separate lanes rather than on top of each other.
    smart('a#s2', 'e#n2'),
    smart('b#e3', 'e#n2'),
    // Level ports with only a free cell between them: the route runs straight through it.
    smart('a#e2', 'f#w1'),
  ])
    .name('root')
    .build();
};

/**
 * Three levels, every shape 256×128: A, scene B, C; inside B, D, scene E, F, with two rectangles either side
 * of E; inside E, X, Y, Z with a box above X, below Z and beside each; each level's shapes linked. Open the
 * scenes to check that a shape is the same size at the same zoom on every level.
 */
export const createNestedDeepTree = () => {
  const root = 'scene:root';
  const size = { width: 256, height: 128 };
  const at = (y: number, x = 0) => ({ x: x - size.width / 2, y: y - size.height / 2, ...size });
  const rect = (id: string, y: number, x = 0) => ViewBuilder.rect(id, at(y, x)).properties({ label: id.toUpperCase() });
  // An unlabelled box beside the column.
  const box = (id: string, y: number, x: number) => ViewBuilder.rect(id, at(y, x));
  const link = (from: string, to: string) => ViewBuilder.link('smart', from, to);
  return ViewBuilder.view(root, [
    rect('a', -256),
    ViewBuilder.view('b', [
      rect('d', -256),
      // X, Y, Z down the middle, with a box above X, below Z and either side of each.
      ViewBuilder.view('e', [
        box('n', -512, 0),
        box('xw', -256, -384),
        rect('x', -256),
        box('xe', -256, 384),
        rect('y', 0),
        box('zw', 256, -384),
        rect('z', 256),
        box('ze', 256, 384),
        box('s', 512, 0),
        link('n', 'x'),
        link('xw', 'x'),
        link('x', 'xe'),
        link('x', 'y'),
        link('y', 'z'),
        link('zw', 'z'),
        link('z', 'ze'),
        link('z', 's'),
      ])
        .at(at(0))
        .name('E'),
      rect('f', 256),
      // Two rectangles either side of E.
      rect('g', 0, -768),
      rect('h', 0, -384),
      rect('i', 0, 384),
      rect('j', 0, 768),
      link('d', 'e'),
      link('e', 'f'),
      link('g', 'h'),
      link('h', 'e'),
      link('e', 'i'),
      link('i', 'j'),
    ])
      .at(at(0))
      .name('B'),
    rect('c', 256),
    link('a', 'b'),
    link('b', 'c'),
  ])
    .name('root')
    .build();
};

/** The root view: A → B, two linked shapes and no view node, so a select-all can be grouped into an Object. */
export const createLinkedPairTree = () => {
  const size = { width: 256, height: 128 };
  const at = (x: number, y = 0) => ({ x: x - size.width / 2, y: y - size.height / 2, ...size });
  return ViewBuilder.view('scene:root', [
    ViewBuilder.rect('a', at(-256)).properties({ label: 'A' }),
    ViewBuilder.rect('b', at(256)).properties({ label: 'B' }),
    ViewBuilder.link('smart', 'a', 'b'),
  ])
    .name('root')
    .build();
};

/** The root view: A, B centred and view C, linked A → B → C; C holds D → E. */
export const createNestedSimpleTree = () => {
  const size = { width: 256, height: 128 };
  const at = (x: number, y = 0) => ({ x: x - size.width / 2, y: y - size.height / 2, ...size });
  return ViewBuilder.view('scene:root', [
    ViewBuilder.rect('a', at(-512)).properties({ label: 'A' }),
    ViewBuilder.rect('b', at(0)).properties({ label: 'B' }),
    ViewBuilder.view('c', [
      ViewBuilder.rect('d', at(-256)).properties({ label: 'D' }),
      ViewBuilder.rect('e', at(256)).properties({ label: 'E' }),
      ViewBuilder.link('smart', 'd', 'e'),
    ])
      .name('C')
      .at({ x: 512 - 192, y: -128, width: 384, height: 256 }),
    ViewBuilder.link('smart', 'a', 'b'),
    ViewBuilder.link('smart', 'b', 'c'),
  ])
    .name('root')
    .build();
};

/** A labelled view node onto a nested View of two linked shapes, beside a rectangle. */
export const createNestedViewTree = () => {
  const root = 'scene:root';
  const size = { width: 256, height: 128 };
  const at = (x: number, y = 0) => ({ x: x - size.width / 2, y: y - size.height / 2, ...size });
  return ViewBuilder.view(root, [
    ViewBuilder.rect('a', at(-384)).properties({ label: 'A' }),
    ViewBuilder.view('view', [
      ViewBuilder.rect('b', at(-192)).properties({ label: 'B' }),
      ViewBuilder.rect('c', at(192)).properties({ label: 'C' }),
      ViewBuilder.link('smart', 'b', 'c'),
    ])
      .name('Inner')
      .at({ x: 0, y: -128, width: 512, height: 256 })
      .properties({ label: 'View' }),
    ViewBuilder.link('smart', 'a', 'view'),
  ])
    .name('root')
    .build();
};

/**
 * Objects placed across views: Logo (two shapes) twice, once in the root and once inside the Section view; Card, which
 * holds a Logo of its own; and Badge, defined but placed nowhere.
 */
export const createObjectsTree = (): ViewTree => {
  const size = { width: 256, height: 128 };
  const at = (x: number, y = 0) => ({ x: x - size.width / 2, y: y - size.height / 2, ...size });
  // Placeholders, made instances below: the builder places shapes and frames, not instances.
  const placed: Record<string, ViewId> = { 'logo-1': 'logo', 'card-1': 'card', 'logo-2': 'logo', 'card-logo': 'logo' };
  const drawing = ViewBuilder.view('scene:root', [
    ViewBuilder.rect('title', at(-512, -256)).properties({ label: 'Title' }),
    ViewBuilder.rect('logo-1', at(-512, 64)),
    ViewBuilder.rect('card-1', at(0, 64)),
    ViewBuilder.view('section', [
      ViewBuilder.rect('logo-2', at(-192)),
      ViewBuilder.rect('caption', at(192)).properties({ label: 'Caption' }),
    ])
      .name('Section')
      .at({ x: 320, y: -64, width: 512, height: 256 }),
    ViewBuilder.link('smart', 'title', 'logo-1'),
  ])
    .name('root')
    .build();
  const definition = (id: ViewId, name: string, elements: Parameters<typeof ViewBuilder.view>[1]): View => ({
    ...ViewBuilder.view(id, elements).name(name).build().views[0],
    kind: 'composite',
  });
  const composites = [
    definition('logo', 'Logo', [
      ViewBuilder.ellipse('mark', at(-128)).properties({ label: 'Mark' }),
      ViewBuilder.rect('word', at(128)).properties({ label: 'Word' }),
      ViewBuilder.link('smart', 'mark', 'word'),
    ]),
    definition('card', 'Card', [
      ViewBuilder.rect('card-logo', at(-128)),
      ViewBuilder.note('body', at(128)).properties({ text: 'Body' }),
    ]),
    definition('badge', 'Badge', [ViewBuilder.ellipse('dot', at(0)).properties({ label: 'Badge' })]),
  ];
  const toInstances = (scene: View): View => ({
    ...scene,
    nodes: Object.fromEntries(
      Object.entries(scene.nodes).map(([id, node]): [string, Node] => {
        const composite = placed[id];
        const instance: InstanceNode | undefined = composite
          ? { type: 'instance', id, z: node.z, center: node.center, size: node.size, composite }
          : undefined;
        return [id, instance ?? node];
      }),
    ),
  });
  return { root: drawing.root, views: [...drawing.views, ...composites].map(toInstances) };
};
