//
// Copyright 2026 DXOS.org
//

// A 2D solid: shapes joined into one, or one cut from another, as 3D's solids are of theirs. The model keeps the
// operation and the shapes it is of (hidden while the solid stands for them); the outline is worked out from them
// each time the layout is read, so it is never stored and cannot go stale.

import * as Schema from 'effect/Schema';
import ClipperLib from 'js-clipper';

import {
  type NodeBase,
  Point,
  isCloudNode,
  isPathNode,
  isPolygonNode,
  isPolylineNode,
  isShapeNode,
  nodeBase,
  solidBounds2D,
  solidOperands,
} from '@dxos/scene';

import { flattenPath } from './path.ts';
import { polylinePath } from './polyline.ts';
import { shapeNodeOutline } from './shape-recipe.ts';
import { cloudPath, polygonPath } from './silhouette.ts';

/** The operations a 2D solid draws: its operands joined, or the first with the rest cut from it. */
export const SOLID_OPS = ['union', 'difference'] as const;
export type SolidOp = (typeof SOLID_OPS)[number];

/** A closed line through its points, the last joined to the first. */
export type Ring = readonly Point[];

/**
 * The `solid` type's schema. `op` and `operands` are the model's own (the ids of the elements it is made of, in
 * order); `rings` is the outline they make, in the unit space of the frame, which the viewport sets as it reads the
 * layout and never writes.
 */
export const SolidNode = Schema.Struct({
  type: Schema.Literal('solid'),
  ...nodeBase,
  label: Schema.optional(Schema.String),
  op: Schema.optional(Schema.String),
  operands: Schema.optional(Schema.String),
  rings: Schema.optional(Schema.Array(Schema.Array(Point))),
});
export type SolidNode = Schema.Schema.Type<typeof SolidNode>;

export const isSolidNode = (node: NodeBase): node is SolidNode => node.type === 'solid';

/** The fields of a drawn node the viewport works out as it reads a layout, which a write leaves out. */
export const DERIVED_NODE_FIELDS: readonly string[] = ['rings'];

/** Clipper works in whole numbers: a hundredth of a px is finer than anything drawn. */
const SCALE = 100;

/** Sides an ellipse is cut into: at the sizes drawn, no flat is seen. */
const ELLIPSE_SIDES = 96;

const { ClipType, PolyFillType, PolyType } = ClipperLib;

const toPath = (ring: Ring): ClipperLib.Path =>
  ring.map(({ x, y }) => ({ X: Math.round(x * SCALE), Y: Math.round(y * SCALE) }));

const fromPath = (path: ClipperLib.Path): Point[] => path.map(({ X, Y }) => ({ x: X / SCALE, y: Y / SCALE }));

const clip = (
  type: number,
  subject: readonly ClipperLib.Path[],
  clips: readonly ClipperLib.Path[],
  fill: number,
): ClipperLib.Path[] => {
  const clipper = new ClipperLib.Clipper();
  clipper.AddPaths([...subject], PolyType.ptSubject, true);
  clips.length > 0 && clipper.AddPaths([...clips], PolyType.ptClip, true);
  const solution: ClipperLib.Path[] = [];
  clipper.Execute(type, solution, fill, PolyFillType.pftNonZero);
  return solution;
};

/**
 * The region `operands` make under `op`, as rings: each operand is a shape's rings, and the result's holes run the
 * other way round from its outsides, so it fills as drawn by either of SVG's rules. `evenOdd` names the operands
 * whose own rings fill by that rule (artwork), where every other shape fills by winding.
 */
export const combineRings = (
  op: SolidOp,
  operands: readonly (readonly Ring[])[],
  evenOdd: readonly boolean[] = [],
): Point[][] => {
  // Each operand first as one region of its own: two shapes drawn opposite ways round would else cancel where they
  // overlap.
  const regions = operands.map((rings, index) =>
    clip(
      ClipType.ctUnion,
      rings.filter((ring) => ring.length > 2).map(toPath),
      [],
      evenOdd[index] ? PolyFillType.pftEvenOdd : PolyFillType.pftNonZero,
    ),
  );
  const [base = [], ...rest] = regions;
  const result =
    op === 'union'
      ? clip(ClipType.ctUnion, regions.flat(), [], PolyFillType.pftNonZero)
      : clip(ClipType.ctDifference, base, rest.flat(), PolyFillType.pftNonZero);
  return result.map(fromPath);
};

/** A node of a layout by its id, hidden or not: a solid's operands are not drawn, and so are in no render list. */
export type NodeLookup = (id: string) => NodeBase | undefined;

/** A node's outline in its own frame's px, origin top-left; `path` is the solids being worked out, outermost first. */
const frameRings = (node: NodeBase, lookup: NodeLookup, path: readonly string[]): Ring[] => {
  const { width, height } = node.size;
  if (isSolidNode(node)) {
    return (solidRings(node, lookup, path) ?? []).map((ring) =>
      ring.map(({ x, y }) => ({ x: x * width, y: y * height })),
    );
  }
  if (node.type === 'ellipse') {
    return [
      Array.from({ length: ELLIPSE_SIDES }, (_, index) => {
        const angle = (index * 2 * Math.PI) / ELLIPSE_SIDES;
        return { x: (width / 2) * (1 + Math.cos(angle)), y: (height / 2) * (1 + Math.sin(angle)) };
      }),
    ];
  }
  if (isPolygonNode(node)) {
    return flattenPath(polygonPath(node.size, { ...node.params }));
  }
  if (isCloudNode(node)) {
    return flattenPath(cloudPath(node.size, 0, node.params?.bumps));
  }
  if (isShapeNode(node)) {
    return [shapeNodeOutline(node)];
  }
  if (isPolylineNode(node)) {
    // An open line encloses nothing, so it neither adds to a shape nor cuts from one.
    return node.params?.closed
      ? flattenPath(
          polylinePath(node.size, node.points, { closed: true, smooth: node.params.smooth, bends: node.bends }),
        )
      : [];
  }
  if (isPathNode(node)) {
    const box = node.viewBox;
    return box.width > 0 && box.height > 0
      ? flattenPath(node.d).map((ring) =>
          ring.map(({ x, y }) => ({ x: ((x - box.x) / box.width) * width, y: ((y - box.y) / box.height) * height })),
        )
      : [];
  }
  return [
    [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ],
  ];
};

/** A node's outline where it stands in its layout, turned as it is. */
export const nodeRings = (
  node: NodeBase,
  lookup: NodeLookup = () => undefined,
  path: readonly string[] = [],
): Ring[] => {
  const angle = ((node.rotation ?? 0) * Math.PI) / 180;
  const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
  return frameRings(node, lookup, path).map((ring) =>
    ring.map(({ x, y }) => {
      const [dx, dy] = [x - node.size.width / 2, y - node.size.height / 2];
      return { x: node.center.x + dx * cos - dy * sin, y: node.center.y + dx * sin + dy * cos };
    }),
  );
};

const isSolidOp = (op: unknown): op is SolidOp => SOLID_OPS.some((known) => known === op);

/**
 * The outline a solid draws, in the unit space of its frame: its operands' outlines where they stand, joined or cut,
 * read from the box the model framed the solid by (`solidBounds2D`), so a solid moved, sized or turned takes its
 * outline with it. Undefined where it cannot be made: an operand is missing, the solid is made of itself, or nothing
 * is left of it; it is then drawn as its frame.
 */
export const solidRings = (
  node: SolidNode,
  lookup: NodeLookup,
  path: readonly string[] = [],
): Point[][] | undefined => {
  const ids = solidOperands(node.operands);
  const operands = ids.map(lookup);
  if (!isSolidOp(node.op) || ids.length === 0 || path.includes(node.id) || operands.some((operand) => !operand)) {
    return undefined;
  }
  const present = operands.flatMap((operand) => (operand ? [operand] : []));
  const bounds = solidBounds2D(node.op, present);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    return undefined;
  }
  const next = [...path, node.id];
  const rings = combineRings(
    node.op,
    present.map((operand) => nodeRings(operand, lookup, next)),
    present.map(isPathNode),
  );
  return rings.length > 0
    ? rings.map((ring) =>
        ring.map(({ x, y }) => ({ x: (x - bounds.x) / bounds.width, y: (y - bounds.y) / bounds.height })),
      )
    : undefined;
};

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * SVG path data for a solid's outline in a frame of `size`, kept `inset` px inside it; with no outline to draw, the
 * frame itself.
 */
export const solidPath = (
  size: { width: number; height: number },
  rings: readonly Ring[] | undefined,
  inset = 0,
): string => {
  const width = Math.max(0, size.width - 2 * inset);
  const height = Math.max(0, size.height - 2 * inset);
  const drawn: readonly Ring[] =
    rings && rings.length > 0
      ? rings
      : [
          [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
          ],
        ];
  return drawn
    .map(
      (ring) =>
        `${ring.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${round(inset + x * width)} ${round(inset + y * height)}`).join(' ')} Z`,
    )
    .join(' ');
};
