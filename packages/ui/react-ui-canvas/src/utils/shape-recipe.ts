//
// Copyright 2026 DXOS.org
//

//
// Parametric shapes. A recipe makes a shape's outline from its frame and a few parameters, and says what each
// parameter is measured against: a side of the frame, its shorter side, or scene px. That is what holds a part's
// proportions when the frame is resized: an arrow's head is as long as a share of the frame's height, so widening the
// arrow lengthens only its shaft. A recipe's controls are handles on the canvas, each setting one parameter.
//

import { type Point, type ShapeNode, type Size } from '@dxos/scene';

import { polylinePath } from './polyline.ts';

/**
 * What a parameter is measured against. A length is a share of the frame's `width`, its `height` or the shorter of
 * the two (`min`), or scene `px`, which a resize leaves alone; a `count` is a whole number and no length.
 */
export type ParamUnit = 'px' | 'width' | 'height' | 'min' | 'count';

export type ShapeParam = {
  id: string;
  title: string;
  unit: ParamUnit;
  default: number;
  min: number;
  max: number;
};

/** A recipe's parameters as lengths in the frame's px (a count as itself), by parameter id. */
export type ShapeValues = Readonly<Record<string, number>>;

/** A handle on the canvas that sets one parameter. */
export type ShapeControl = {
  param: string;
  /** Where the handle sits, in the frame's px (origin top-left). */
  at: (size: Size, values: ShapeValues) => Point;
  /** The parameter's length in px once the handle is dragged to `point`, in the frame's px. */
  drag: (size: Size, point: Point) => number;
};

export type ShapeRecipe = {
  id: string;
  name: string;
  icon: string;
  /** Tools panel shortcut. */
  key?: string;
  /** Size when created, in nominal units. */
  defaultSize: Size;
  params: readonly ShapeParam[];
  controls: readonly ShapeControl[];
  /** The values the frame has room for: a part that would not fit is drawn as large as does. */
  fit?: (size: Size, values: ShapeValues) => ShapeValues;
  /** The outline's vertices in order, in the frame's px. */
  outline: (size: Size, values: ShapeValues) => readonly Point[];
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** The length one unit of a parameter is, in the frame's px. */
const unitLength = (unit: ParamUnit, { width, height }: Size): number => {
  switch (unit) {
    case 'px':
    case 'count':
      return 1;
    case 'width':
      return width;
    case 'height':
      return height;
    case 'min':
      return Math.min(width, height);
  }
};

/** A stored parameter within its range, a count as a whole number; unset or not a number, the default. */
const stored = (param: ShapeParam, value: number | undefined): number => {
  const given = value !== undefined && Number.isFinite(value) ? value : param.default;
  return clamp(param.unit === 'count' ? Math.round(given) : given, param.min, param.max);
};

/** The recipe's parameters as lengths in a frame of `size`, each within its range and within what the frame fits. */
export const shapeValues = (
  recipe: ShapeRecipe,
  size: Size,
  params: Readonly<Record<string, number>> | undefined,
): ShapeValues => {
  const values = Object.fromEntries(
    recipe.params.map((param) => [param.id, stored(param, params?.[param.id]) * unitLength(param.unit, size)]),
  );
  return recipe.fit ? recipe.fit(size, values) : values;
};

/** The outline a recipe draws in a frame of `size`, in the frame's px. */
export const shapeOutline = (
  recipe: ShapeRecipe,
  size: Size,
  params: Readonly<Record<string, number>> | undefined,
): readonly Point[] => recipe.outline(size, shapeValues(recipe, size, params));

/** Where each of a recipe's handles sits in a frame of `size`, in the frame's px. */
export const shapeHandles = (
  recipe: ShapeRecipe,
  size: Size,
  params: Readonly<Record<string, number>> | undefined,
): { param: string; at: Point }[] => {
  const values = shapeValues(recipe, size, params);
  return recipe.controls.map((control) => ({ param: control.param, at: control.at(size, values) }));
};

/**
 * The stored parameters once the handle of `param` is dragged to `point` (the frame's px): that parameter in its own
 * unit and within its range, the others as they were.
 */
export const dragShapeParam = (
  recipe: ShapeRecipe,
  size: Size,
  params: Readonly<Record<string, number>> | undefined,
  param: string,
  point: Point,
): Record<string, number> => {
  const spec = recipe.params.find(({ id }) => id === param);
  const control = recipe.controls.find((control) => control.param === param);
  const unit = spec ? unitLength(spec.unit, size) : 0;
  if (!spec || !control || unit <= 0) {
    return { ...params };
  }
  // Rounded so a drag does not store a float's noise.
  const value = Math.round((control.drag(size, point) / unit) * 1000) / 1000;
  return { ...params, [param]: stored(spec, value) };
};

//
// Recipes.
//

/** Shared by the shapes with an arrow's head: its length and the shaft's thickness, both shares of the height. */
const HEAD: ShapeParam = { id: 'head', title: 'Head', unit: 'height', default: 0.5, min: 0.05, max: 4 };
const SHAFT: ShapeParam = { id: 'shaft', title: 'Shaft', unit: 'height', default: 0.66, min: 0.05, max: 1 };

const arrow: ShapeRecipe = {
  id: 'arrow',
  name: 'Arrow',
  icon: 'ph--arrow-fat-right--regular',
  key: 'A',
  defaultSize: { width: 4, height: 2 },
  params: [HEAD, SHAFT],
  fit: ({ width }, values) => ({ ...values, head: Math.min(values.head, width) }),
  outline: ({ width, height }, { head, shaft }) => {
    const [neck, top] = [width - head, (height - shaft) / 2];
    return [
      { x: 0, y: top },
      { x: neck, y: top },
      { x: neck, y: 0 },
      { x: width, y: height / 2 },
      { x: neck, y: height },
      { x: neck, y: height - top },
      { x: 0, y: height - top },
    ];
  },
  controls: [
    { param: 'head', at: ({ width }, { head }) => ({ x: width - head, y: 0 }), drag: ({ width }, { x }) => width - x },
    {
      param: 'shaft',
      at: ({ width, height }, { head, shaft }) => ({ x: width - head, y: (height - shaft) / 2 }),
      drag: ({ height }, { y }) => height - 2 * y,
    },
  ],
};

const doubleArrow: ShapeRecipe = {
  id: 'double-arrow',
  name: 'Double arrow',
  icon: 'ph--arrows-horizontal--regular',
  defaultSize: { width: 4, height: 2 },
  params: [HEAD, SHAFT],
  fit: ({ width }, values) => ({ ...values, head: Math.min(values.head, width / 2) }),
  outline: ({ width, height }, { head, shaft }) => {
    const [neck, top] = [width - head, (height - shaft) / 2];
    return [
      { x: 0, y: height / 2 },
      { x: head, y: 0 },
      { x: head, y: top },
      { x: neck, y: top },
      { x: neck, y: 0 },
      { x: width, y: height / 2 },
      { x: neck, y: height },
      { x: neck, y: height - top },
      { x: head, y: height - top },
      { x: head, y: height },
    ];
  },
  controls: arrow.controls,
};

const chevron: ShapeRecipe = {
  id: 'chevron',
  name: 'Chevron',
  icon: 'ph--caret-double-right--regular',
  defaultSize: { width: 4, height: 2 },
  params: [{ id: 'point', title: 'Point', unit: 'height', default: 0.5, min: 0, max: 4 }],
  fit: ({ width }, values) => ({ ...values, point: Math.min(values.point, width / 2) }),
  outline: ({ width, height }, { point }) => [
    { x: 0, y: 0 },
    { x: width - point, y: 0 },
    { x: width, y: height / 2 },
    { x: width - point, y: height },
    { x: 0, y: height },
    { x: point, y: height / 2 },
  ],
  controls: [
    {
      param: 'point',
      at: ({ width }, { point }) => ({ x: width - point, y: 0 }),
      drag: ({ width }, { x }) => width - x,
    },
  ],
};

const callout: ShapeRecipe = {
  id: 'callout',
  name: 'Callout',
  icon: 'ph--chat-centered--regular',
  defaultSize: { width: 4, height: 3 },
  // The tail is a size in px, so a larger callout keeps the tail it had.
  params: [
    { id: 'tail', title: 'Tail', unit: 'px', default: 24, min: 0, max: 480 },
    { id: 'at', title: 'Tail at', unit: 'width', default: 0.2, min: 0, max: 1 },
  ],
  fit: ({ width, height }, values) => {
    const tail = Math.min(values.tail, height / 2, width);
    return { tail, at: Math.min(values.at, width - tail) };
  },
  outline: ({ width, height }, { tail, at }) => {
    const base = height - tail;
    return [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: base },
      { x: at + tail, y: base },
      { x: at, y: height },
      { x: at, y: base },
      { x: 0, y: base },
    ];
  },
  controls: [
    {
      param: 'tail',
      at: ({ height }, { tail, at }) => ({ x: at + tail, y: height - tail }),
      drag: ({ height }, { y }) => height - y,
    },
    { param: 'at', at: ({ height }, { at }) => ({ x: at, y: height }), drag: (_, { x }) => x },
  ],
};

const parallelogram: ShapeRecipe = {
  id: 'parallelogram',
  name: 'Parallelogram',
  icon: 'ph--parallelogram--regular',
  defaultSize: { width: 4, height: 2 },
  params: [{ id: 'slant', title: 'Slant', unit: 'height', default: 0.5, min: 0, max: 4 }],
  fit: ({ width }, values) => ({ ...values, slant: Math.min(values.slant, width) }),
  outline: ({ width, height }, { slant }) => [
    { x: slant, y: 0 },
    { x: width, y: 0 },
    { x: width - slant, y: height },
    { x: 0, y: height },
  ],
  controls: [{ param: 'slant', at: (_, { slant }) => ({ x: slant, y: 0 }), drag: (_, { x }) => x }],
};

const trapezoid: ShapeRecipe = {
  id: 'trapezoid',
  name: 'Trapezoid',
  icon: 'px--trapezoid--regular',
  defaultSize: { width: 4, height: 2 },
  params: [{ id: 'inset', title: 'Inset', unit: 'height', default: 0.4, min: 0, max: 4 }],
  fit: ({ width }, values) => ({ ...values, inset: Math.min(values.inset, width / 2) }),
  outline: ({ width, height }, { inset }) => [
    { x: inset, y: 0 },
    { x: width - inset, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ],
  controls: [{ param: 'inset', at: (_, { inset }) => ({ x: inset, y: 0 }), drag: (_, { x }) => x }],
};

const cross: ShapeRecipe = {
  id: 'cross',
  name: 'Cross',
  icon: 'ph--plus--regular',
  defaultSize: { width: 2, height: 2 },
  // An arm as thick as a share of the shorter side, so both arms are one thickness in a frame of any shape.
  params: [{ id: 'arm', title: 'Arm', unit: 'min', default: 0.34, min: 0.05, max: 1 }],
  outline: ({ width, height }, { arm }) => {
    const [left, right, top, bottom] = [(width - arm) / 2, (width + arm) / 2, (height - arm) / 2, (height + arm) / 2];
    return [
      { x: left, y: 0 },
      { x: right, y: 0 },
      { x: right, y: top },
      { x: width, y: top },
      { x: width, y: bottom },
      { x: right, y: bottom },
      { x: right, y: height },
      { x: left, y: height },
      { x: left, y: bottom },
      { x: 0, y: bottom },
      { x: 0, y: top },
      { x: left, y: top },
    ];
  },
  controls: [
    {
      param: 'arm',
      at: ({ width, height }, { arm }) => ({ x: (width + arm) / 2, y: (height - arm) / 2 }),
      drag: ({ width }, { x }) => 2 * (x - width / 2),
    },
  ],
};

/** A star's vertex `index` of `2 * points`, the even ones on the frame's ellipse and the odd ones `inner` px in. */
const starVertex = ({ width, height }: Size, points: number, inner: number, index: number): Point => {
  const half = Math.min(width, height) / 2;
  const reach = index % 2 === 0 || half <= 0 ? 1 : inner / half;
  const angle = -Math.PI / 2 + (index * Math.PI) / points;
  return { x: (width / 2) * (1 + reach * Math.cos(angle)), y: (height / 2) * (1 + reach * Math.sin(angle)) };
};

const star: ShapeRecipe = {
  id: 'star',
  name: 'Star',
  icon: 'ph--star--regular',
  defaultSize: { width: 2, height: 2 },
  params: [
    { id: 'points', title: 'Points', unit: 'count', default: 5, min: 3, max: 12 },
    // The inner vertices' distance from the centre, a share of the shorter side: half of it is the outer radius.
    { id: 'inner', title: 'Inner', unit: 'min', default: 0.2, min: 0.02, max: 0.5 },
  ],
  outline: (size, { points, inner }) =>
    Array.from({ length: points * 2 }, (_, index) => starVertex(size, points, inner, index)),
  controls: [
    {
      param: 'inner',
      at: (size, { points, inner }) => starVertex(size, points, inner, 1),
      // Measured in the frame's own proportions, so the handle follows the pointer in a frame that is not square.
      drag: ({ width, height }, { x, y }) =>
        width > 0 && height > 0
          ? (Math.hypot((x - width / 2) / (width / 2), (y - height / 2) / (height / 2)) * Math.min(width, height)) / 2
          : 0,
    },
  ],
};

/** Where along a tooth's share of the rim its flanks start and end: the tip is the middle half. */
const COG_PROFILE = [0.15, 0.25, 0.75, 0.85] as const;

/** A cog's vertex: `corner` of tooth `tooth`, the two middle corners on the frame's ellipse and the others `depth` px in. */
const cogVertex = ({ width, height }: Size, teeth: number, depth: number, tooth: number, corner: number): Point => {
  const half = Math.min(width, height) / 2;
  const reach = corner === 1 || corner === 2 || half <= 0 ? 1 : 1 - depth / half;
  // A tooth's tip is centred at the top of the frame.
  const angle = -Math.PI / 2 + ((tooth + COG_PROFILE[corner] - 0.5) * 2 * Math.PI) / teeth;
  return { x: (width / 2) * (1 + reach * Math.cos(angle)), y: (height / 2) * (1 + reach * Math.sin(angle)) };
};

const cog: ShapeRecipe = {
  id: 'cog',
  name: 'Cog',
  icon: 'ph--gear--regular',
  defaultSize: { width: 2, height: 2 },
  params: [
    { id: 'teeth', title: 'Teeth', unit: 'count', default: 8, min: 4, max: 24 },
    // How far a tooth stands out of the wheel, a share of the shorter side.
    { id: 'depth', title: 'Depth', unit: 'min', default: 0.1, min: 0.02, max: 0.4 },
  ],
  outline: (size, { teeth, depth }) =>
    Array.from({ length: teeth * COG_PROFILE.length }, (_, index) =>
      cogVertex(size, teeth, depth, Math.floor(index / COG_PROFILE.length), index % COG_PROFILE.length),
    ),
  controls: [
    {
      param: 'depth',
      // The foot of the first tooth's trailing flank.
      at: (size, { teeth, depth }) => cogVertex(size, teeth, depth, 0, 3),
      drag: ({ width, height }, { x, y }) =>
        width > 0 && height > 0
          ? (1 - Math.hypot((x - width / 2) / (width / 2), (y - height / 2) / (height / 2))) *
            (Math.min(width, height) / 2)
          : 0,
    },
  ],
};

/** The recipe a shape made with no other takes. */
export const DEFAULT_SHAPE = arrow.id;

/** The recipes the canvas draws, in the order its tools panel offers them. */
export const SHAPE_RECIPES: readonly ShapeRecipe[] = [
  arrow,
  doubleArrow,
  chevron,
  callout,
  parallelogram,
  trapezoid,
  cross,
  star,
  cog,
];

/** The recipe a shape names; undefined for one this build does not have, which is then drawn as its frame. */
export const shapeRecipe = (id: string): ShapeRecipe | undefined => SHAPE_RECIPES.find((recipe) => recipe.id === id);

/** A shape node's outline in its frame's px; its frame's corners where its recipe is unknown. */
export const shapeNodeOutline = ({ recipe, size, params }: Pick<ShapeNode, 'recipe' | 'size' | 'params'>): Point[] => {
  const known = shapeRecipe(recipe);
  return known
    ? [...shapeOutline(known, size, params)]
    : [
        { x: 0, y: 0 },
        { x: size.width, y: 0 },
        { x: size.width, y: size.height },
        { x: 0, y: size.height },
      ];
};

/**
 * SVG path data for a shape node's outline in its frame's px, kept `inset` px inside it and its corners rounded by
 * `radius`; empty for a frame with no area.
 */
export const shapeNodePath = (node: Pick<ShapeNode, 'recipe' | 'size' | 'params'>, inset = 0, radius = 0): string => {
  const { width, height } = node.size;
  if (width <= 0 || height <= 0) {
    return '';
  }
  const points = shapeNodeOutline(node).map(({ x, y }) => ({ x: x / width, y: y / height }));
  return polylinePath(node.size, points, { inset, closed: true, radius });
};

/** `point` turned `degrees` clockwise about `center`. */
const turn = ({ x, y }: Point, center: Point, degrees: number): Point => {
  if (degrees === 0) {
    return { x, y };
  }
  const angle = (degrees * Math.PI) / 180;
  const [dx, dy] = [x - center.x, y - center.y];
  return {
    x: center.x + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: center.y + dx * Math.sin(angle) + dy * Math.cos(angle),
  };
};

type PlacedShape = Pick<ShapeNode, 'recipe' | 'center' | 'size' | 'rotation' | 'params'>;

/** A shape node's handles where they are drawn, in scene coordinates: in its frame, turned as the node is. */
export const shapeNodeHandles = ({
  recipe,
  center,
  size,
  rotation,
  params,
}: PlacedShape): { param: string; at: Point }[] => {
  const known = shapeRecipe(recipe);
  const origin = { x: center.x - size.width / 2, y: center.y - size.height / 2 };
  return known
    ? shapeHandles(known, size, params).map(({ param, at }) => ({
        param,
        at: turn({ x: origin.x + at.x, y: origin.y + at.y }, center, rotation ?? 0),
      }))
    : [];
};

/**
 * A shape node's stored parameters once the handle of `param` is dragged to `point`, in scene coordinates; as they
 * are for a recipe this build does not have.
 */
export const dragShapeNodeParam = (
  { recipe, center, size, rotation, params }: PlacedShape,
  param: string,
  point: Point,
): Record<string, number> => {
  const known = shapeRecipe(recipe);
  if (!known) {
    return { ...params };
  }
  const { x, y } = turn(point, center, -(rotation ?? 0));
  return dragShapeParam(known, size, params, param, {
    x: x - (center.x - size.width / 2),
    y: y - (center.y - size.height / 2),
  });
};
