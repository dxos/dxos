//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { nearestOnScreen, planeMove } from './move.ts';

describe('planeMove', () => {
  const box = { min: { x: -0.5, y: 0, z: -0.5 }, max: { x: 0.5, y: 1, z: 0.5 } };
  const grab = { x: 0, y: 1, z: 0 };
  const detent = { x: 0.05, y: 0.05, z: 0.05 };

  test('free, the drag moves the body by the pointer', () => {
    const delta = { x: 0.37, y: 0, z: -0.12 };
    expect(planeMove({ delta, box, grab, axes: ['x', 'z'], step: 0, detent })).toEqual(delta);
  });

  test("while dragging, the body's low corner holds on a minor line it passes within the detent, and follows otherwise", () => {
    const moved = planeMove({ delta: { x: 0.26, y: 0, z: 0.13 }, box, grab, axes: ['x', 'z'], step: 0.25, detent });
    expect(moved.x).toBeCloseTo(0.25);
    expect(moved.z).toBeCloseTo(0.13);
  });

  test('on release the corner lands on the nearest minor line along each axis of the plane, and off it stays put', () => {
    const moved = planeMove({
      delta: { x: 0.37, y: 0.2, z: -0.12 },
      ...{ box, grab, axes: ['x', 'z'] as const, step: 0.25, detent, landing: true },
    });
    expect(moved).toEqual({ x: 0.25, y: 0, z: 0 });
  });

  test('held to one axis, the body moves along it alone, up included', () => {
    const moved = planeMove({ delta: { x: 0.4, y: 0.6, z: 0.3 }, box, grab, axes: ['y'], step: 0.25, detent });
    expect(moved).toEqual({ x: 0, y: expect.closeTo(0.6), z: 0 });
  });

  test('a point under the pointer holds the grab point on it, ahead of the grid', () => {
    const point = { x: 1.63, y: 1, z: 0.71 };
    const moved = planeMove({
      delta: { x: 1.6, y: 0, z: 0.68 },
      ...{ box, grab, axes: ['x', 'z'] as const, step: 0.25, detent, point, landing: true },
    });
    expect(moved.x).toBeCloseTo(1.63);
    expect(moved.z).toBeCloseTo(0.71);
  });

  test("a face under the pointer holds the body's nearer side flush on it along that face's axis; elsewhere the grid", () => {
    const face = { axis: 'x' as const, at: 2.1 };
    const moved = planeMove({
      delta: { x: 1.57, y: 0, z: 0.37 },
      box,
      grab,
      axes: ['x', 'z'],
      step: 0.25,
      detent,
      face,
    });
    expect(moved.x).toBeCloseTo(1.6);
    expect(moved.z).toBeCloseTo(0.37);
    const away = planeMove({ delta: { x: 0.9, y: 0, z: 0 }, box, grab, axes: ['x', 'z'], step: 0.25, detent, face });
    expect(away.x).toBeCloseTo(0.9);
  });
});

describe('nearestOnScreen', () => {
  test('the point drawn nearest the pointer within the detent; none when all are farther', () => {
    const points = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
    ];
    const toScreen = ({ x }: { x: number }) => ({ x: x * 100, y: 50 });
    expect(nearestOnScreen(points, { x: 95, y: 52 }, toScreen, 8)).toEqual({ x: 1, y: 0, z: 0 });
    expect(nearestOnScreen(points, { x: 50, y: 50 }, toScreen, 8)).toBeUndefined();
  });
});
