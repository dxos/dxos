//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Point } from '@dxos/scene';

import { parabolaPoint } from './polyline.ts';
import { favorMajor, nearestSize, readStroke, recognizeShape, strokePauses } from './recognize.ts';

/** A hand's wobble: a few px off the line, the same every run. */
const wobble = (index: number, reach: number): Point => ({
  x: Math.sin(index * 1.7) * reach,
  y: Math.cos(index * 2.3) * reach,
});

/** A stroke round `corners`, a sample every few px, ending a little short of where it began. */
const strokeRound = (corners: readonly Point[], reach = 2): Point[] => {
  const ring = [...corners, corners[0]];
  const points = ring.slice(1).flatMap((corner, edge) =>
    Array.from({ length: 20 }, (_, step) => {
      const from = ring[edge];
      const share = step / 20;
      return { x: from.x + (corner.x - from.x) * share, y: from.y + (corner.y - from.y) * share };
    }),
  );
  return points.map((point, index) => {
    const off = wobble(index, reach);
    return { x: point.x + off.x, y: point.y + off.y };
  });
};

/** A stroke round an ellipse in the box, wobbling as a hand does. */
const strokeEllipse = (x: number, y: number, width: number, height: number, reach = 2): Point[] =>
  Array.from({ length: 60 }, (_, index) => {
    const angle = (index / 60) * 2 * Math.PI;
    const off = wobble(index, reach);
    return {
      x: x + width / 2 + (width / 2) * Math.cos(angle) + off.x,
      y: y + height / 2 + (height / 2) * Math.sin(angle) + off.y,
    };
  });

const BOX = { x: 100, y: 50, width: 200, height: 120 };
const [left, top, right, bottom] = [BOX.x, BOX.y, BOX.x + BOX.width, BOX.y + BOX.height];
const [midX, midY] = [BOX.x + BOX.width / 2, BOX.y + BOX.height / 2];

describe('recognizeShape', () => {
  test('a stroke round four corners is a rectangle, in the box it was drawn in', ({ expect }) => {
    const found = recognizeShape(
      strokeRound([
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom },
      ]),
    );
    expect(found?.shape).toBe('rect');
    // The bounds are the stroke's own, wobble and all: within a few px of the box.
    expect(Math.abs((found?.bounds.x ?? 0) - left)).toBeLessThan(4);
    expect(Math.abs((found?.bounds.width ?? 0) - BOX.width)).toBeLessThan(8);
  });

  test('a stroke round a circle or an oval is an ellipse', ({ expect }) => {
    expect(recognizeShape(strokeEllipse(0, 0, 160, 160))?.shape).toBe('ellipse');
    expect(recognizeShape(strokeEllipse(0, 0, 240, 100))?.shape).toBe('ellipse');
  });

  test('a stroke round three corners is a triangle, pointing the way it was drawn', ({ expect }) => {
    const turned = (corners: Point[]) => {
      const found = recognizeShape(strokeRound(corners));
      return [found?.shape, found?.rotation];
    };
    expect(
      turned([
        { x: midX, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom },
      ]),
    ).toEqual(['triangle', undefined]);
    expect(
      turned([
        { x: right, y: midY },
        { x: left, y: bottom },
        { x: left, y: top },
      ]),
    ).toEqual(['triangle', 90]);
    expect(
      turned([
        { x: midX, y: bottom },
        { x: left, y: top },
        { x: right, y: top },
      ]),
    ).toEqual(['triangle', 180]);
    expect(
      turned([
        { x: left, y: midY },
        { x: right, y: top },
        { x: right, y: bottom },
      ]),
    ).toEqual(['triangle', 270]);
  });

  test('a stroke round the middles of the sides is a diamond', ({ expect }) => {
    const found = recognizeShape(
      strokeRound([
        { x: midX, y: top },
        { x: right, y: midY },
        { x: midX, y: bottom },
        { x: left, y: midY },
      ]),
    );
    expect(found?.shape).toBe('diamond');
  });

  test('a rougher hand is still read', ({ expect }) => {
    const corners = [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left, y: bottom },
    ];
    expect(recognizeShape(strokeRound(corners, 6))?.shape).toBe('rect');
    expect(recognizeShape(strokeEllipse(0, 0, 200, 140, 6))?.shape).toBe('ellipse');
  });

  test('a stroke that is no shape is left a line', ({ expect }) => {
    const corners = [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left, y: bottom },
    ];
    // Left open: three sides of a box.
    expect(recognizeShape(strokeRound(corners).slice(0, 55))).toBeUndefined();
    // A wave, which ends far from where it began.
    const wave = Array.from({ length: 60 }, (_, index) => ({ x: index * 5, y: 60 * Math.sin(index / 6) }));
    expect(recognizeShape(wave)).toBeUndefined();
    // A scribble back and forth along one side of its box, which comes back to its start.
    const scribble = Array.from({ length: 60 }, (_, index) => ({
      x: 100 + 100 * Math.sin(index / 5),
      y: 50 + (index % 2) * 3 + (index > 50 ? (60 - index) * 8 : index < 10 ? index * 8 : 80),
    }));
    expect(recognizeShape(scribble)).toBeUndefined();
    // Too few samples, and too small to be worth a shape.
    expect(recognizeShape(strokeRound(corners).slice(0, 5))).toBeUndefined();
    expect(recognizeShape(strokeRound(corners), 400)).toBeUndefined();
  });
});

describe('nearestSize', () => {
  const last = { width: 240, height: 120 };
  const tool = { width: 192, height: 96 };

  test('a size close to a known one on both sides takes it, the first known first', ({ expect }) => {
    // Within a quarter of each side of the last shape's size.
    expect(nearestSize({ width: 216, height: 132 }, [last, tool])).toBe(last);
    // Not near the last shape's, but near the tool's own.
    expect(nearestSize({ width: 168, height: 84 }, [last, tool])).toBe(tool);
    // Near both: the last shape's, which comes first.
    expect(nearestSize({ width: 216, height: 108 }, [last, tool])).toBe(last);
  });

  test('a size near neither, or near on one side alone, is kept as drawn', ({ expect }) => {
    const tall = { width: 192, height: 300 };
    expect(nearestSize(tall, [last, tool])).toBe(tall);
    const small = { width: 60, height: 36 };
    expect(nearestSize(small, [last, tool])).toBe(small);
    // Nothing known yet.
    expect(nearestSize(small, [undefined])).toBe(small);
  });
});

describe('favorMajor', () => {
  test('a value within a minor cell of a major line takes it, and any other the nearest minor line', ({ expect }) => {
    // Minor 12, major 48: a major line at 0, 48, 96.
    expect([0, 5, 12, 40, 47, 53, 60].map((value) => favorMajor(value, 12, 48))).toEqual([0, 0, 0, 48, 48, 48, 48]);
    expect([13, 17, 19, 25, 31, 35].map((value) => favorMajor(value, 12, 48))).toEqual([12, 12, 24, 24, 36, 36]);
    expect(favorMajor(-40, 12, 48)).toBe(-48);
    expect(favorMajor(-20, 12, 48)).toBe(-24);
    // Another grid: minor 16, major 64.
    expect([70, 90, 120].map((value) => favorMajor(value, 16, 64))).toEqual([64, 96, 128]);
  });
});

/** A stroke with the time each sample was taken. */
type Timed = { points: Point[]; times: number[] };

/** How long the hand rests at a corner, and between two samples on the move, in ms. */
const [REST, STEP] = [250, 8];

/**
 * A stroke drawn as `legs`, each a run of samples a few px apart, the hand resting between one leg and the next and
 * wobbling as it goes. The last leg ends a little short of where the next would begin.
 */
const timedStroke = (legs: readonly ((share: number) => Point)[], reach = 1.5): Timed => {
  const points: Point[] = [];
  const times: number[] = [];
  let now = 0;
  legs.forEach((leg, index) => {
    const samples = 24;
    for (let step = 0; step < samples; step++) {
      const off = wobble(points.length, reach);
      const at = leg(step / samples);
      points.push({ x: at.x + off.x, y: at.y + off.y });
      // The first sample of a leg is where the hand rested, so the wait is before the one after it.
      now += step === 1 && index > 0 ? REST : STEP;
      times.push(now);
    }
  });
  return { points, times };
};

const straight =
  (from: Point, to: Point) =>
  (share: number): Point => ({ x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share });

const bowed =
  (from: Point, control: Point, to: Point) =>
  (share: number): Point =>
    parabolaPoint(from, control, to, share);

/** The legs of a stroke round `corners` and back to the first. */
const round = (corners: readonly Point[]) =>
  corners.map((corner, index) => straight(corner, corners[(index + 1) % corners.length]));

const GRID = { minimum: 24, minor: 12, major: 48 };

describe('strokePauses', () => {
  test('the hand resting between two legs is a pause, at the corner', ({ expect }) => {
    const { points, times } = timedStroke(
      round([
        { x: 0, y: 0 },
        { x: 200, y: 0 },
        { x: 200, y: 120 },
        { x: 0, y: 120 },
      ]),
    );
    const pauses = strokePauses(points, times);
    expect(pauses).toHaveLength(3);
    // Each is within a sample of where a leg began.
    expect(pauses.map((index) => Math.round(index / 24))).toEqual([1, 2, 3]);
  });

  test('a stroke drawn at one speed, or with no times, has none', ({ expect }) => {
    const points = strokeEllipse(0, 0, 200, 140);
    expect(
      strokePauses(
        points,
        points.map((_, index) => index * STEP),
      ),
    ).toEqual([]);
    expect(strokePauses(points, [])).toEqual([]);
  });
});

describe('readStroke', () => {
  const path = (stroke: Timed) => {
    const read = readStroke(stroke.points, stroke.times, GRID);
    return read?.kind === 'path' ? read.path : undefined;
  };
  const shape = (stroke: Timed) => {
    const read = readStroke(stroke.points, stroke.times, GRID);
    return read?.kind === 'shape' ? read.shape : undefined;
  };

  test('five straight sides drawn with a pause at each corner are a closed line of five points', ({ expect }) => {
    // A house: two walls, a floor, and a roof to a point.
    const found = path(
      timedStroke(
        round([
          { x: 2, y: 242 },
          { x: 5, y: 98 },
          { x: 146, y: -3 },
          { x: 290, y: 95 },
          { x: 286, y: 238 },
        ]),
      ),
    );
    expect(found?.closed).toBe(true);
    expect(found?.bends).toEqual([]);
    // Each corner on the grid, a major line where one was near.
    expect(found?.points).toEqual([
      { x: 0, y: 240 },
      { x: 0, y: 96 },
      { x: 144, y: 0 },
      { x: 288, y: 96 },
      { x: 288, y: 240 },
    ]);
  });

  test('three straight sides and one that bows are a box with a bend, not a rectangle', ({ expect }) => {
    const [nw, ne, se, sw] = [
      { x: 0, y: 0 },
      { x: 288, y: 0 },
      { x: 288, y: 192 },
      { x: 0, y: 192 },
    ];
    const found = path(
      timedStroke([bowed(nw, { x: 144, y: 190 }, ne), straight(ne, se), straight(se, sw), straight(sw, nw)]),
    );
    expect(found?.closed).toBe(true);
    expect(found?.points).toEqual([nw, ne, se, sw]);
    expect(found?.bends).toHaveLength(1);
    const [bend] = found?.bends ?? [];
    expect(bend.segment).toBe(0);
    // Centred on its side, its depth on the grid.
    expect(bend.control.x).toBe(144);
    expect(Math.abs(bend.control.y - 190)).toBeLessThanOrEqual(12);
    expect(bend.control.y % 12).toBe(0);
  });

  test('two arcs between the same two points are a crescent: two points and two bends', ({ expect }) => {
    const [top, bottom] = [
      { x: 240, y: 0 },
      { x: 240, y: 336 },
    ];
    const found = path(timedStroke([bowed(top, { x: -240, y: 168 }, bottom), bowed(bottom, { x: 48, y: 168 }, top)]));
    expect(found?.closed).toBe(true);
    expect(found?.points).toEqual([top, bottom]);
    expect(found?.bends.map(({ segment }) => segment)).toEqual([0, 1]);
    const [outer, inner] = found?.bends ?? [];
    expect(outer.control.x).toBeLessThan(inner.control.x);
    expect(inner.control.x).toBeLessThan(240);
  });

  test('a straight side that leans a little is made level or upright, and one that slopes is left', ({ expect }) => {
    // The walls lean and the floor tilts, each by a few degrees; the roof slopes as a roof does.
    const found = path(
      timedStroke(
        round([
          { x: 22, y: 250 },
          { x: 2, y: 98 },
          { x: 146, y: -3 },
          { x: 280, y: 95 },
          { x: 300, y: 230 },
        ]),
      ),
    );
    const [floorLeft, eaveLeft, peak, eaveRight, floorRight] = found?.points ?? [];
    expect(floorLeft.x).toBe(eaveLeft.x);
    expect(floorRight.x).toBe(eaveRight.x);
    expect(floorLeft.y).toBe(floorRight.y);
    expect(peak.y).toBeLessThan(eaveLeft.y);
    expect(peak.x).toBeGreaterThan(eaveLeft.x);
    // A line drawn alone, nearly level: both ends on the major line it ran along.
    const line = path(timedStroke([straight({ x: 3, y: 2 }, { x: 190, y: 20 })]));
    expect(line?.points.map(({ y }) => y)).toEqual([0, 0]);
  });

  test('corners drawn nearly in line are put in line, so two walls are one height', ({ expect }) => {
    // The right wall is drawn shorter than the left: its eave is a little lower.
    const found = path(
      timedStroke(
        round([
          { x: 2, y: 242 },
          { x: 5, y: 98 },
          { x: 146, y: -3 },
          { x: 290, y: 118 },
          { x: 286, y: 238 },
        ]),
      ),
    );
    const [floorLeft, eaveLeft, peak, eaveRight, floorRight] = found?.points ?? [];
    expect(eaveLeft.y).toBe(eaveRight.y);
    expect(floorLeft.y - eaveLeft.y).toBe(floorRight.y - eaveRight.y);
    // The peak is far from either, and stays its own height.
    expect(peak.y).toBeLessThan(eaveLeft.y);
    // A corner well out of line is left where it was drawn.
    const lopsided = path(
      timedStroke(
        round([
          { x: 2, y: 242 },
          { x: 5, y: 98 },
          { x: 146, y: -3 },
          { x: 290, y: 170 },
          { x: 286, y: 238 },
        ]),
      ),
    );
    expect(lopsided?.points[1].y).toBeLessThan(lopsided?.points[3].y ?? 0);
  });

  test('a shape drawn side by side is still that shape', ({ expect }) => {
    expect(
      shape(
        timedStroke(
          round([
            { x: 0, y: 0 },
            { x: 200, y: 0 },
            { x: 200, y: 120 },
            { x: 0, y: 120 },
          ]),
        ),
      )?.shape,
    ).toBe('rect');
    expect(
      shape(
        timedStroke(
          round([
            { x: 100, y: 0 },
            { x: 200, y: 160 },
            { x: 0, y: 160 },
          ]),
        ),
      )?.shape,
    ).toBe('triangle');
  });

  test('a stroke drawn in one go is read against every shape, as before', ({ expect }) => {
    const read = readStroke(strokeEllipse(0, 0, 200, 140), [], GRID);
    expect(read?.kind === 'shape' && read.shape.shape).toBe('ellipse');
  });

  test('an open stroke is a line: straight, or one bow', ({ expect }) => {
    const line = path(timedStroke([straight({ x: 3, y: 2 }, { x: 190, y: 98 })]));
    expect(line).toEqual({
      points: [
        { x: 0, y: 0 },
        { x: 192, y: 96 },
      ],
      bends: [],
      closed: false,
    });
    const arc = path(timedStroke([bowed({ x: 0, y: 0 }, { x: 96, y: 150 }, { x: 192, y: 0 })]));
    expect(arc?.closed).toBe(false);
    expect(arc?.points).toHaveLength(2);
    expect(arc?.bends).toHaveLength(1);
  });

  test('a pause where the line runs straight on is not a corner', ({ expect }) => {
    const found = path(
      timedStroke([straight({ x: 0, y: 0 }, { x: 96, y: 0 }), straight({ x: 96, y: 0 }, { x: 192, y: 0 })]),
    );
    expect(found?.points).toHaveLength(2);
  });

  test('a stroke too small, or a scribble of too many turns, is not read', ({ expect }) => {
    const small = timedStroke([straight({ x: 0, y: 0 }, { x: 10, y: 4 })]);
    expect(readStroke(small.points, small.times, GRID)).toBeUndefined();
    const zigzag = timedStroke(
      Array.from({ length: 12 }, (_, index) =>
        straight(
          { x: index * 40, y: index % 2 === 0 ? 0 : 120 },
          { x: (index + 1) * 40, y: index % 2 === 0 ? 120 : 0 },
        ),
      ),
    );
    expect(readStroke(zigzag.points, zigzag.times, GRID)).toBeUndefined();
  });
});
