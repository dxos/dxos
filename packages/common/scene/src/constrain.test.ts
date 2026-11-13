//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { hasConstraints, mapPoint, pointBounds, solvePartBounds } from './constrain.ts';
import { type Bounds } from './element.ts';

/** A card authored 288 wide and 192 tall, with its top-left at the origin. */
const FROM: Bounds = { x: 0, y: 0, width: 288, height: 192 };

/** The same card placed twice as wide and twice as tall. */
const TO: Bounds = { x: 0, y: 0, width: 576, height: 384 };

/** Where a part with nothing to say lands: every coordinate doubled, since the frame doubled on both axes. */
const scaled = ({ x, y, width, height }: Bounds): Bounds => ({
  x: x * 2,
  y: y * 2,
  width: width * 2,
  height: height * 2,
});

const solve = (part: Bounds, layout?: Parameters<typeof solvePartBounds>[2]) =>
  solvePartBounds(part, { from: FROM, to: TO }, layout);

describe('part constraints', () => {
  test('an unconstrained part keeps its proportion of each axis, which is what `scale` means', () => {
    const part: Bounds = { x: 12, y: 12, width: 36, height: 36 };
    expect(solve(part)).toEqual(scaled(part));
    expect(solve(part, { x: 'scale', y: 'scale' })).toEqual(scaled(part));
  });

  test('min keeps the gap to the left and top edges, and the part its own size', () => {
    const icon: Bounds = { x: 12, y: 12, width: 36, height: 36 };
    expect(solve(icon, { x: 'min', y: 'min' })).toEqual({ x: 12, y: 12, width: 36, height: 36 });
  });

  test('max keeps the gap to the right and bottom edges', () => {
    // The footer sits 12 above the bottom and 12 in from each side, 18 tall.
    const footer: Bounds = { x: 12, y: 162, width: 264, height: 18 };
    expect(solve(footer, { x: 'max', y: 'max' })).toEqual({ x: 300, y: 354, width: 264, height: 18 });
  });

  test('stretch makes both edges follow, so the part absorbs the whole change', () => {
    const body: Bounds = { x: 12, y: 60, width: 264, height: 90 };
    expect(solve(body, { x: 'stretch', y: 'stretch' })).toEqual({ x: 12, y: 60, width: 552, height: 282 });
  });

  test('a frame smaller than the part gaps collapses it rather than inverting it', () => {
    const body: Bounds = { x: 100, y: 0, width: 88, height: 192 };
    const tiny: Bounds = { x: 0, y: 0, width: 120, height: 192 };
    const solved = solvePartBounds(body, { from: FROM, to: tiny }, { x: 'stretch' });
    expect(solved.width).toEqual(0);
    expect(solved.x).toEqual(100);
  });

  test('center keeps the offset from the middle', () => {
    const title: Bounds = { x: 84, y: 0, width: 120, height: 24 };
    // Authored centred on x, so it stays centred; y is unconstrained and takes the uniform fit.
    expect(solve(title, { x: 'center' })).toMatchObject({ x: 228, width: 120 });
  });

  test('the axes are solved independently', () => {
    const footer: Bounds = { x: 12, y: 162, width: 264, height: 18 };
    expect(solve(footer, { x: 'stretch', y: 'max' })).toEqual({ x: 12, y: 354, width: 552, height: 18 });
  });

  test("a card's regions land where the card draws them at any size", () => {
    const header: Bounds = { x: 12, y: 12, width: 36, height: 36 };
    const body: Bounds = { x: 12, y: 60, width: 264, height: 90 };
    const footer: Bounds = { x: 12, y: 162, width: 264, height: 18 };
    const solved = {
      header: solve(header, { x: 'min', y: 'min' }),
      body: solve(body, { x: 'stretch', y: 'stretch' }),
      footer: solve(footer, { x: 'stretch', y: 'max' }),
    };
    // The glyph is still in the top-left corner, the footer still on the bottom, and the body fills between them.
    expect(solved.header.y).toEqual(12);
    expect(solved.footer.y + solved.footer.height).toEqual(TO.height - 12);
    expect(solved.body.y).toEqual(solved.header.y + solved.header.height + 12);
    expect(solved.body.y + solved.body.height).toEqual(solved.footer.y - 12);
  });
});

describe('free points', () => {
  test('a point keeps its proportion of the box it sits in', () => {
    const before: Bounds = { x: 0, y: 0, width: 100, height: 50 };
    const after: Bounds = { x: 10, y: 20, width: 200, height: 100 };
    expect(mapPoint({ x: 50, y: 25 }, before, after)).toEqual({ x: 110, y: 70 });
  });

  test('a degenerate axis keeps the offset rather than dividing by zero', () => {
    const before: Bounds = { x: 0, y: 40, width: 100, height: 0 };
    const after: Bounds = { x: 0, y: 90, width: 100, height: 0 };
    expect(mapPoint({ x: 25, y: 40 }, before, after)).toEqual({ x: 25, y: 90 });
  });

  test("a hairline's ends keep their inset when its box stretches and pins to the bottom", () => {
    const [left, right] = [
      { x: 12, y: 162, width: 0, height: 0 },
      { x: 276, y: 162, width: 0, height: 0 },
    ];
    const box = pointBounds({ x: left.x, y: left.y }, { x: right.x, y: right.y });
    const solved = solvePartBounds(box, { from: FROM, to: TO }, { x: 'stretch', y: 'max' });
    expect(mapPoint({ x: 12, y: 162 }, box, solved)).toEqual({ x: 12, y: 354 });
    expect(mapPoint({ x: 276, y: 162 }, box, solved)).toEqual({ x: 564, y: 354 });
  });

  test('two points span the box between them, in either order', () => {
    expect(pointBounds({ x: 10, y: 40 }, { x: 30, y: 20 })).toEqual({ x: 10, y: 20, width: 20, height: 20 });
    expect(pointBounds({ x: 30, y: 20 }, { x: 10, y: 40 })).toEqual({ x: 10, y: 20, width: 20, height: 20 });
  });
});

describe('hasConstraints', () => {
  test('is false for a composite authored before constraints existed', () => {
    expect(hasConstraints([{}, { constrain: {} }])).toBe(false);
  });

  test('is true as soon as one element constrains one axis', () => {
    expect(hasConstraints([{}, { constrain: { y: 'max' } }])).toBe(true);
  });
});
