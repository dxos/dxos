//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Point } from '@dxos/scene';

import { favorMajor, nearestSize, recognizeShape } from './recognize.ts';

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
