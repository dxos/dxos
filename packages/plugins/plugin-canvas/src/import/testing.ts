//
// Copyright 2026 DXOS.org
//

//
// Representative tldraw 3.0 documents, as plugin-tldraw stores them in `Drawing.Canvas.content` (records by id).
//

type Records = Record<string, Record<string, unknown>>;

const PAGE = 'page:page';

const document = (): Records => ({
  'document:document': { id: 'document:document', typeName: 'document', gridSize: 10, name: '', meta: {} },
  [PAGE]: { id: PAGE, typeName: 'page', name: 'Page 1', index: 'a1', meta: {} },
});

type ShapeOptions = {
  parentId?: string;
  index: string;
  x?: number;
  y?: number;
  rotation?: number;
  props?: Record<string, unknown>;
};

const shape = (
  id: string,
  type: string,
  { parentId = PAGE, index, x = 0, y = 0, rotation = 0, props = {} }: ShapeOptions,
) => ({
  [`shape:${id}`]: {
    id: `shape:${id}`,
    typeName: 'shape',
    type,
    parentId,
    index,
    x,
    y,
    rotation,
    isLocked: false,
    opacity: 1,
    meta: {},
    props,
  },
});

const geoProps = (props: Record<string, unknown>) => ({
  geo: 'rectangle',
  w: 100,
  h: 100,
  color: 'black',
  labelColor: 'black',
  fill: 'none',
  dash: 'draw',
  size: 'm',
  font: 'draw',
  text: '',
  align: 'middle',
  verticalAlign: 'middle',
  growY: 0,
  url: '',
  scale: 1,
  ...props,
});

const arrowProps = (props: Record<string, unknown>) => ({
  color: 'black',
  labelColor: 'black',
  fill: 'none',
  dash: 'draw',
  size: 'm',
  arrowheadStart: 'none',
  arrowheadEnd: 'arrow',
  font: 'draw',
  start: { x: 0, y: 0 },
  end: { x: 100, y: 0 },
  bend: 0,
  text: '',
  labelPosition: 0.5,
  scale: 1,
  ...props,
});

const binding = (id: string, arrow: string, target: string, terminal: 'start' | 'end') => ({
  [`binding:${id}`]: {
    id: `binding:${id}`,
    typeName: 'binding',
    type: 'arrow',
    fromId: `shape:${arrow}`,
    toId: `shape:${target}`,
    meta: {},
    props: { terminal, normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false },
  },
});

/** A rectangle and an ellipse with labels and colours, joined by a bound arrow. */
export const shapesAndArrow = (): Records => ({
  ...document(),
  ...shape('box', 'geo', {
    index: 'a1',
    x: 0,
    y: 0,
    props: geoProps({ w: 200, h: 100, text: 'Box', color: 'blue', fill: 'solid', dash: 'dashed' }),
  }),
  ...shape('oval', 'geo', {
    index: 'a2',
    x: 400,
    y: 0,
    props: geoProps({ geo: 'ellipse', w: 120, h: 80, text: 'Oval', color: 'light-red', fill: 'semi', size: 'l' }),
  }),
  ...shape('arrow', 'arrow', {
    index: 'a3',
    x: 200,
    y: 50,
    props: arrowProps({ end: { x: 200, y: 0 }, text: 'calls', color: 'green' }),
  }),
  ...binding('b1', 'arrow', 'box', 'start'),
  ...binding('b2', 'arrow', 'oval', 'end'),
});

/**
 * Free text, a sticky note, an unbound curved arrow, a cloud, a hexagon and a star (both approximated), and a freehand
 * stroke (skipped).
 */
export const textNoteAndFreeArrow = (): Records => ({
  ...document(),
  ...shape('text', 'text', {
    index: 'a1',
    x: 0,
    y: 0,
    props: {
      color: 'violet',
      size: 'l',
      font: 'mono',
      textAlign: 'middle',
      w: 240,
      text: 'Title\nSubtitle',
      scale: 1,
      autoSize: true,
    },
  }),
  ...shape('sticky', 'note', {
    index: 'a2',
    x: 300,
    y: 0,
    props: {
      color: 'yellow',
      size: 'm',
      font: 'draw',
      align: 'middle',
      verticalAlign: 'middle',
      growY: 0,
      text: 'Remember',
      url: '',
      fontSizeAdjustment: 0,
      scale: 1,
    },
  }),
  ...shape('free', 'arrow', {
    index: 'a3',
    x: 10,
    y: 300,
    props: arrowProps({
      start: { x: 0, y: 0 },
      end: { x: 150, y: 50 },
      bend: 20,
      arrowheadStart: 'dot',
      arrowheadEnd: 'triangle',
    }),
  }),
  ...shape('star', 'geo', { index: 'a4', x: 600, y: 0, props: geoProps({ geo: 'star' }) }),
  ...shape('scribble', 'draw', {
    index: 'a5',
    props: {
      color: 'black',
      fill: 'none',
      dash: 'draw',
      size: 'm',
      segments: [
        {
          type: 'free',
          points: [
            { x: 0, y: 0, z: 0.5 },
            { x: 40, y: 20, z: 0.5 },
          ],
        },
      ],
      isComplete: true,
      isClosed: false,
      isPen: false,
      scale: 1,
    },
  }),
  ...shape('cloud', 'geo', { index: 'a6', x: 600, y: 200, props: geoProps({ geo: 'cloud', text: 'Sky' }) }),
  ...shape('hexagon', 'geo', { index: 'a7', x: 800, y: 200, props: geoProps({ geo: 'hexagon' }) }),
});

/** A frame holding two shapes and an arrow between them, plus an arrow from outside bound into the frame. */
export const frameWithChildren = (): Records => ({
  ...document(),
  ...shape('frame', 'frame', { index: 'a1', x: 100, y: 100, props: { w: 400, h: 300, name: 'Stage' } }),
  ...shape('inner-a', 'geo', { parentId: 'shape:frame', index: 'a1', x: 20, y: 20, props: geoProps({ text: 'A' }) }),
  ...shape('inner-b', 'geo', { parentId: 'shape:frame', index: 'a2', x: 250, y: 150, props: geoProps({ text: 'B' }) }),
  ...shape('inner-arrow', 'arrow', { parentId: 'shape:frame', index: 'a3', x: 120, y: 70, props: arrowProps({}) }),
  ...binding('i1', 'inner-arrow', 'inner-a', 'start'),
  ...binding('i2', 'inner-arrow', 'inner-b', 'end'),
  ...shape('outside', 'geo', { index: 'a2', x: 700, y: 100, props: geoProps({ text: 'Out' }) }),
  ...shape('cross', 'arrow', { index: 'a3', x: 700, y: 150, props: arrowProps({ end: { x: -400, y: 0 } }) }),
  ...binding('c1', 'cross', 'outside', 'start'),
  ...binding('c2', 'cross', 'inner-a', 'end'),
});

/**
 * A rotated group holding two rectangles, an arrow between them and a polyline; an arrow from outside bound to one
 * member; and a rotated rectangle on the page.
 */
export const groupAndRotation = (): Records => ({
  ...document(),
  ...shape('group', 'group', { index: 'a1', x: 1000, y: 0, rotation: Math.PI / 2, props: {} }),
  ...shape('member', 'geo', { parentId: 'shape:group', index: 'a1', x: 0, y: 0, props: geoProps({ w: 100, h: 50 }) }),
  ...shape('partner', 'geo', {
    parentId: 'shape:group',
    index: 'a3',
    x: 200,
    y: 0,
    props: geoProps({ w: 100, h: 50 }),
  }),
  ...shape('pair', 'arrow', { parentId: 'shape:group', index: 'a4', x: 100, y: 25, props: arrowProps({}) }),
  ...binding('p1', 'pair', 'member', 'start'),
  ...binding('p2', 'pair', 'partner', 'end'),
  ...shape('polyline', 'line', {
    parentId: 'shape:group',
    index: 'a2',
    x: 0,
    y: 100,
    props: {
      color: 'orange',
      dash: 'dotted',
      size: 'm',
      spline: 'line',
      points: {
        a1: { id: 'a1', index: 'a1', x: 0, y: 0 },
        a2: { id: 'a2', index: 'a2', x: 100, y: 0 },
        a3: { id: 'a3', index: 'a3', x: 100, y: 100 },
      },
      scale: 1,
    },
  }),
  ...shape('tilted', 'geo', { index: 'a2', x: 0, y: 0, rotation: Math.PI, props: geoProps({ w: 100, h: 60 }) }),
  ...shape('neighbour', 'geo', { index: 'a3', x: 700, y: 100, props: geoProps({}) }),
  ...shape('tie', 'arrow', { index: 'a4', x: 800, y: 150, props: arrowProps({ end: { x: 175, y: -100 } }) }),
  ...binding('t1', 'tie', 'neighbour', 'start'),
  ...binding('t2', 'tie', 'member', 'end'),
});

/** Two pages: shapes on the second are left out. */
export const twoPages = (): Records => ({
  ...document(),
  'page:second': { id: 'page:second', typeName: 'page', name: 'Page 2', index: 'a2', meta: {} },
  ...shape('first', 'geo', { index: 'a1', props: geoProps({}) }),
  ...shape('second', 'geo', { parentId: 'page:second', index: 'a1', props: geoProps({}) }),
});
