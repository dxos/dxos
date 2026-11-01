//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { planeMove } from './move.ts';

describe('planeMove', () => {
  const box = { min: { x: -0.5, y: 0, z: -0.5 }, max: { x: 0.5, y: 1, z: 0.5 } };
  const detent = { x: 0.05, y: 0.05, z: 0.05 };

  test('free, the drag moves the body by the pointer', () => {
    const delta = { x: 0.37, y: 0, z: -0.12 };
    expect(planeMove({ delta, box, axes: ['x', 'z'], step: 0, detent })).toEqual({ delta, faces: [] });
  });

  test("while dragging, the body's low corner holds on a minor line it passes within the detent, and follows otherwise", () => {
    const { delta } = planeMove({ delta: { x: 0.26, y: 0, z: 0.13 }, box, axes: ['x', 'z'], step: 0.25, detent });
    expect(delta.x).toBeCloseTo(0.25);
    expect(delta.z).toBeCloseTo(0.13);
  });

  test('on release the corner lands on the nearest minor line along each axis of the plane, and off it stays put', () => {
    const { delta } = planeMove({
      delta: { x: 0.37, y: 0.2, z: -0.12 },
      box,
      axes: ['x', 'z'],
      step: 0.25,
      detent,
      landing: true,
    });
    expect(delta).toEqual({ x: 0.25, y: 0, z: 0 });
  });

  test("a side passing near another body's side is held flush on it, ahead of the grid, and names that side", () => {
    const boxes = { b: { min: { x: 1.6, y: 0, z: -3 }, max: { x: 2.6, y: 1, z: 3 } } };
    const moved = planeMove({ delta: { x: 1.07, y: 0, z: 0 }, box, axes: ['x', 'z'], step: 0.25, detent, boxes });
    expect(moved.delta.x).toBeCloseTo(1.1);
    expect(moved.faces).toEqual([{ key: 'b', normal: { x: -1, y: 0, z: 0 } }]);
  });
});
