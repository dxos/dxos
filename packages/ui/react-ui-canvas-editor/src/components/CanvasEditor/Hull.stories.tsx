//
// Copyright 2026 DXOS.org
//

//
// A hull is a border round a set of shapes. It is stored as a group of them (an Instance over its own parts, as the
// Group command makes one) and drawn opened out, so its shapes are selected, moved and linked like any others. These
// stories draw the same six shapes and the same eight elbow links three ways, to compare the two borders a hull may
// take and what a lattice adds to them: there the border runs along the gutters, and each link keeps to the side of
// it its two ends are on.
//
// 1. Pick the Hull tool (B) and drag a frame round some shapes, or select them and run Enclose: a hull is drawn
//    round them.
// 2. Select a hull and change Hull in Properties between Perimeter and Box, or restyle it as any shape.
// 3. Move a shape inside a hull: the border follows it. Drag the hull: its shapes go with it. On the lattice the
//    links re-route as they land.
// 4. Storage holds Space, Queue and Index. A link between two of them stays inside its border; a link from outside
//    crosses the border once, to the shape it ends at; a link between two shapes outside goes round the hull.
// 5. Delete a hull: its shapes stay where they are.
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import {
  DEFAULT_LATTICE,
  HULL_STYLE,
  type RenderList2D,
  cellBounds,
  collapseHulls,
  createLink,
  fromRenderLists2D,
} from '@dxos/react-ui-canvas';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import {
  HULL_SHAPES,
  type HullNode,
  type HullShape,
  type Link,
  type NodeStyle,
  type Point,
  type RectNode,
  type Scene,
} from '@dxos/scene';

import { FullEditor, SceneEditorStory } from '../../testing/index.ts';

const HULL = 'storage';

/** A shape of the drawing: where it stands on the lattice, and where it stands when nothing places it. */
type Shape = {
  id: string;
  label: string;
  cell: readonly [col: number, row: number];
  free: Point;
  hue: NodeStyle['hue'];
  inside?: boolean;
};

// On the lattice Storage's three shapes make an L, with a free cell in its corner:
//
//   col   -1       0       1       2
//   row -1 Client  Space   Queue   .
//   row  0 .       Index   .       Agent
//   row  1 Edge    .       .       .
const SHAPES: readonly Shape[] = [
  { id: 'space', label: 'Space', cell: [0, -1], free: { x: -48, y: -144 }, hue: 'blue', inside: true },
  { id: 'queue', label: 'Queue', cell: [1, -1], free: { x: 288, y: -192 }, hue: 'blue', inside: true },
  { id: 'index', label: 'Index', cell: [0, 0], free: { x: 48, y: 96 }, hue: 'blue', inside: true },
  { id: 'client', label: 'Client', cell: [-1, -1], free: { x: -480, y: -192 }, hue: 'neutral' },
  { id: 'agent', label: 'Agent', cell: [2, 0], free: { x: 672, y: 48 }, hue: 'neutral' },
  { id: 'edge', label: 'Edge', cell: [-1, 1], free: { x: -384, y: 336 }, hue: 'green' },
];

/** The links, the same in every story: three inside Storage, three into it, two between shapes outside it. */
const LINKS: readonly (readonly [source: string, target: string])[] = [
  ['space', 'queue'],
  ['space', 'index'],
  ['queue', 'index'],
  ['client', 'space'],
  ['agent', 'queue'],
  ['edge', 'index'],
  ['client', 'edge'],
  ['edge', 'agent'],
];

const FREE_SIZE = { width: 192, height: 96 };

const boardOf = (shape: HullShape, lattice: boolean): RenderList2D => {
  const nodes = SHAPES.map(({ id, label, cell: [col, row], free, hue, inside }, index): RectNode => {
    const bounds = cellBounds({ col, row, spanX: 1, spanY: 1 }, DEFAULT_LATTICE);
    const placed = lattice
      ? {
          center: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
          size: { width: bounds.width, height: bounds.height },
        }
      : { center: free, size: FREE_SIZE };
    return {
      type: 'rect',
      id,
      z: `b${index + 1}`,
      ...placed,
      label,
      style: { hue },
      ...(inside ? { parent: HULL } : {}),
    };
  });
  const hull: HullNode = {
    type: 'hull',
    id: HULL,
    z: 'a1',
    // Its frame and border are fitted round the shapes inside it as the drawing is read.
    center: { x: 0, y: 0 },
    size: FREE_SIZE,
    label: 'Storage',
    shape,
    style: { ...HULL_STYLE, hue: 'blue' },
  };
  const links: Link[] = LINKS.map(([source, target], index) =>
    createLink({
      type: 'smart',
      id: `${source}-${target}`,
      z: `c${index + 1}`,
      source: { node: source },
      target: { node: target },
    }),
  );
  return {
    id: 'board',
    name: 'Board',
    nodes: Object.fromEntries([hull, ...nodes].map((node) => [node.id, node])),
    links: Object.fromEntries(links.map((link) => [link.id, link])),
  };
};

const documentOf = (shape: HullShape, lattice: boolean): Scene.SceneDocument => {
  // Stored as the editor stores it: the hull a group, its shapes the group's parts.
  const board = boardOf(shape, lattice);
  const document = fromRenderLists2D(Object.values(collapseHulls({ [board.id]: board })), { root: 'board' });
  return lattice
    ? {
        ...document,
        layouts: document.layouts.map((layout) =>
          layout.dim === '2d' ? { ...layout, lattice: DEFAULT_LATTICE } : layout,
        ),
      }
    : document;
};

type StoryArgs = {
  /** The border Storage takes. */
  shape: HullShape;
  /** Shapes on the lattice's cells, their links in its gutters; off, shapes stand where they are put. */
  lattice: boolean;
};

const DefaultStory = ({ shape, lattice }: StoryArgs) => {
  const document = useMemo(() => documentOf(shape, lattice), [shape, lattice]);
  return (
    // Keyed, so a control change opens the new drawing rather than editing the old one.
    <SceneEditorStory key={`${shape}-${lattice}`} document={document} docked select={[HULL]}>
      <FullEditor dim='2d' />
    </SceneEditorStory>
  );
};

const meta = {
  title: 'ui/react-ui-canvas-editor/components/Hull',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations: [...uiTranslations, ...formTranslations] },
  argTypes: {
    shape: { control: 'inline-radio', options: HULL_SHAPES },
    lattice: { control: 'boolean' },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Off the lattice the perimeter is the convex hull of the shapes inside, a margin out. */
export const Perimeter: Story = {
  args: { shape: 'perimeter', lattice: false },
};

/** Off the lattice the box is the rectangle that bounds the shapes inside, a margin out. */
export const Box: Story = {
  args: { shape: 'box', lattice: false },
};

/**
 * On the lattice the border runs along the gutters' centre lines, round the cells Storage's shapes stand on, and
 * every link keeps to its side of it: a quarter of the gutter in for a link inside, a quarter out for one outside.
 */
export const Lattice: Story = {
  args: { shape: 'perimeter', lattice: true },
};

/** On the lattice the box takes the free cell in the corner of the L too, so Edge's link to Agent goes round it. */
export const LatticeBox: Story = {
  args: { shape: 'box', lattice: true },
};
