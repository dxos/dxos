//
// Copyright 2026 DXOS.org
//

//
// Lattice mode on the shared model (docs/DESIGN.md §8b): every change to a shape's frame is snapped onto the layout's
// lattice and refused when it would overlap another shape's cells. Elements stay in scene pixels, so a lattice layout
// is stored exactly as a free one; the rule lives here, between an edit and its write, not in the data.
//

import * as Schema from 'effect/Schema';

import { type Bounds, type LayoutIntent, Scene, applyIntent } from '@dxos/scene';

import { type LatticeSpec, collides, coveredCells, quantize, toCell } from '../utils/index.ts';

type Element = Scene.Element2D;
type Point = { x: number; y: number };
type Size = { width: number; height: number };
type Framed = Element & { center: Point; size: Size };

const isElement2D = Schema.is(Scene.Element2D);

/** Cells taken, by `col,row` key, and the element taking each. */
type Occupancy = Map<string, string>;

const boundsOf = ({ center, size }: { center: Point; size: Size }): Bounds => ({
  x: center.x - size.width / 2,
  y: center.y - size.height / 2,
  width: size.width,
  height: size.height,
});

const frameOf = (bounds: Bounds): { center: Point; size: Size } => ({
  center: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
  size: { width: bounds.width, height: bounds.height },
});

const isLink = (element: Element): boolean => element.source !== undefined || element.target !== undefined;

/**
 * Whether an element takes lattice cells: a shape with a frame of its own that is neither a guide nor a borderless
 * backdrop. A placed object with no size of its own reads its frame from the model, which the layout does not hold, so
 * it moves as given.
 */
const onLattice = (element: Element): element is Framed =>
  element.center !== undefined &&
  element.size !== undefined &&
  !isLink(element) &&
  !element.overrides?.guide &&
  element.overrides?.border !== false;

const occupancy = (layout: Scene.LayoutRecord2D, spec: LatticeSpec, except: ReadonlySet<string>): Occupancy => {
  const cells: Occupancy = new Map();
  for (const element of Object.values(layout.elements)) {
    if (!except.has(element.id) && onLattice(element)) {
      for (const key of coveredCells(toCell(boundsOf(element), spec))) {
        cells.set(key, element.id);
      }
    }
  }
  return cells;
};

const blocked = (layout: Scene.LayoutRecord2D, spec: LatticeSpec, bounds: Bounds, except: ReadonlySet<string>) =>
  collides(toCell(bounds, spec), occupancy(layout, spec, except));

const sameFrame = (left: Element | undefined, right: Element): boolean =>
  JSON.stringify([left?.center, left?.size]) === JSON.stringify([right.center, right.size]);

/** The frame writes that place `id` on `bounds`. */
const placeAt = (id: string, bounds: Bounds): LayoutIntent[] => {
  const { center, size } = frameOf(bounds);
  return [
    { kind: 'update', id, path: ['center'], value: center },
    { kind: 'update', id, path: ['size'], value: size },
  ];
};

/**
 * The elements `ids` placed by `frame` (their frame after the edit) on whole cells, clear of the elements left behind
 * and of each other; undefined when any would overlap. Elements off the lattice go to `free`, moved as the edit says.
 */
const placeTogether = (
  layout: Scene.LayoutRecord2D,
  spec: LatticeSpec,
  ids: readonly string[],
  frame: (element: Framed) => Bounds,
): { placed: LayoutIntent[]; free: string[] } | undefined => {
  const others = occupancy(layout, spec, new Set(ids));
  const taken: Occupancy = new Map();
  const placed: LayoutIntent[] = [];
  const free: string[] = [];
  for (const id of ids) {
    const element = layout.elements[id];
    if (!element || element.locked) {
      continue;
    }
    if (!onLattice(element)) {
      free.push(id);
      continue;
    }
    const bounds = quantize(frame(element), spec);
    const cell = toCell(bounds, spec);
    if (collides(cell, others) || collides(cell, taken)) {
      return undefined;
    }
    for (const key of coveredCells(cell)) {
      taken.set(key, id);
    }
    placed.push(...placeAt(id, bounds));
  }
  return { placed, free };
};

const constrain = (layout: Scene.LayoutRecord2D, intent: LayoutIntent, spec: LatticeSpec): LayoutIntent | undefined => {
  switch (intent.kind) {
    case 'create': {
      const element = intent.element;
      if (!isElement2D(element) || !onLattice(element)) {
        return intent;
      }
      const bounds = quantize(boundsOf(element), spec);
      return blocked(layout, spec, bounds, new Set())
        ? undefined
        : { kind: 'create', element: { ...element, ...frameOf(bounds) } };
    }

    case 'move': {
      const delta = intent.delta;
      if ('z' in delta) {
        return intent;
      }
      // Each shape snaps on its own; together they must clear the shapes left behind and each other.
      const result = placeTogether(layout, spec, intent.ids, (element) => {
        const from = boundsOf(element);
        return { ...from, x: from.x + delta.x, y: from.y + delta.y };
      });
      return (
        result && {
          kind: 'batch',
          intents: [...(result.free.length > 0 ? [{ ...intent, ids: result.free }] : []), ...result.placed],
        }
      );
    }

    case 'scale': {
      const factor = intent.factor;
      if ('z' in factor) {
        return intent;
      }
      const result = placeTogether(layout, spec, intent.ids, (element) =>
        boundsOf({
          center: element.center,
          size: { width: element.size.width * factor.width, height: element.size.height * factor.height },
        }),
      );
      return (
        result && {
          kind: 'batch',
          intents: [...(result.free.length > 0 ? [{ ...intent, ids: result.free }] : []), ...result.placed],
        }
      );
    }

    case 'update': {
      // Only an edit that moves or resizes a shape on the lattice is snapped; a label written with the whole element
      // keeps the shape where it is, on a cell or not.
      const current = layout.elements[intent.id];
      const next = applyIntent(layout, intent).elements[intent.id];
      if (!current || !next || sameFrame(current, next) || !onLattice(next)) {
        return intent;
      }
      const bounds = quantize(boundsOf(next), spec);
      if (blocked(layout, spec, bounds, new Set([intent.id]))) {
        return undefined;
      }
      return intent.path.length === 0
        ? { kind: 'update', id: intent.id, path: [], value: { ...next, ...frameOf(bounds) } }
        : { kind: 'batch', intents: placeAt(intent.id, bounds) };
    }

    case 'batch': {
      // Each step is checked against the layout the steps before it leave; one refused step refuses the batch.
      let working = layout;
      const intents: LayoutIntent[] = [];
      for (const step of intent.intents) {
        const constrained = constrain(working, step, spec);
        if (!constrained) {
          return undefined;
        }
        intents.push(constrained);
        working = applyIntent(working, constrained);
      }
      return { kind: 'batch', intents };
    }

    default:
      return intent;
  }
};

/**
 * `intent` rewritten onto `layout`'s lattice, or undefined when it would overlap occupied cells; the intent as given
 * when the layout has no lattice. Frames (create, move, scale, a centre or size `update`) are snapped; everything else
 * passes through. A batch is checked step by step and refused whole if any step is.
 */
export const latticeConstrain = (layout: Scene.LayoutRecord2D, intent: LayoutIntent): LayoutIntent | undefined =>
  layout.lattice ? constrain(layout, intent, layout.lattice) : intent;
