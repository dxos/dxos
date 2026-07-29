//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ProjectionMapper } from '@dxos/react-ui-canvas';

import { pointSubtract, round } from '../layout';
import { resizeAxis } from './useDragMonitor';
import { createSnap } from './useSnap';

const PITCH = 32;
const BOUNDS = { min: 128, max: 960, symmetric: false };

describe('resizeAxis', () => {
  test('leaves the axis untouched when the anchor does not span it', ({ expect }) => {
    expect(resizeAxis(100, 150, 0, 999, BOUNDS)).toEqual({ center: 100, size: 150 });
  });

  // The bug this guards: an off-grid size used to survive the resize, leaving the dragged edge
  // between grid lines even though the drag delta itself was snapped.
  test('lands the dragged edge on the grid from an off-grid size', ({ expect }) => {
    const center = 0;
    const size = 150; // Not a multiple of the pitch.
    const edge = round(center + size / 2 + 40, PITCH);
    const { center: nextCenter, size: nextSize } = resizeAxis(center, size, 1, edge, BOUNDS);
    expect(nextCenter + nextSize / 2).toBe(edge);
    expect((nextCenter + nextSize / 2) % PITCH).toBe(0);
  });

  test('holds the opposite edge fixed', ({ expect }) => {
    const center = 0;
    const size = 150;
    const fixed = center - size / 2;
    const { center: nextCenter, size: nextSize } = resizeAxis(center, size, 1, round(200, PITCH), BOUNDS);
    expect(nextCenter - nextSize / 2).toBe(fixed);
  });

  test('drags the min edge without moving the max edge', ({ expect }) => {
    const center = 0;
    const size = 160;
    const fixed = center + size / 2;
    const edge = round(-300, PITCH);
    const { center: nextCenter, size: nextSize } = resizeAxis(center, size, -1, edge, BOUNDS);
    expect(nextCenter + nextSize / 2).toBe(fixed);
    expect(nextCenter - nextSize / 2).toBe(edge);
  });

  test('symmetric resize holds the centre and mirrors the edge', ({ expect }) => {
    const center = 64;
    const edge = round(center + 200, PITCH);
    const { center: nextCenter, size: nextSize } = resizeAxis(center, 160, 1, edge, { ...BOUNDS, symmetric: true });
    expect(nextCenter).toBe(center);
    expect(nextCenter + nextSize / 2).toBe(edge);
    expect(nextCenter - nextSize / 2).toBe(center - (edge - center));
  });

  test('clamps to min and max', ({ expect }) => {
    expect(resizeAxis(0, 160, 1, 0, BOUNDS).size).toBe(BOUNDS.min);
    expect(resizeAxis(0, 160, 1, 5000, BOUNDS).size).toBe(BOUNDS.max);
  });

  test('clamping still keeps the opposite edge fixed', ({ expect }) => {
    const center = 0;
    const size = 160;
    const fixed = center - size / 2;
    const { center: nextCenter, size: nextSize } = resizeAxis(center, size, 1, 5000, BOUNDS);
    expect(nextCenter - nextSize / 2).toBe(fixed);
    expect(nextSize).toBe(BOUNDS.max);
  });
});

// The resize path converts the pointer delta to model space before snapping. Snapping a screen-space
// delta lands the edge off-grid at any scale other than 1, which is what these cover.
describe('resize edge snapping under zoom', () => {
  const snap = createSnap({ width: PITCH, height: PITCH });

  /** Mirrors the `resize` branch of `useDragMonitor`'s `onDrag`. */
  const resizeEdge = (
    scale: number,
    initial: { x: number; y: number; width: number; height: number },
    screenDelta: { x: number; y: number },
    anchor: { x: number; y: number },
  ) => {
    const projection = new ProjectionMapper({ width: 1000, height: 1000 }, scale, { x: 0, y: 0 });
    const [from, to] = projection.toModel([
      { x: 0, y: 0 },
      { x: screenDelta.x, y: screenDelta.y },
    ]);
    const delta = pointSubtract(to, from);
    const edge = snap({
      x: initial.x + (anchor.x * initial.width) / 2 + delta.x,
      y: initial.y + (anchor.y * initial.height) / 2 + delta.y,
    });
    const x = resizeAxis(initial.x, initial.width, anchor.x, edge.x, BOUNDS);
    const y = resizeAxis(initial.y, initial.height, anchor.y, edge.y, BOUNDS);
    return { right: x.center + x.size / 2, bottom: y.center + y.size / 2, width: x.size, height: y.size };
  };

  const initial = { x: 0, y: 0, width: 150, height: 150 };

  for (const scale of [0.5, 1, 2, 1.75]) {
    test(`right and bottom edges land on the grid at scale ${scale}`, ({ expect }) => {
      const { right, bottom } = resizeEdge(scale, initial, { x: 137, y: 91 }, { x: 1, y: 1 });
      expect(right % PITCH).toBe(0);
      expect(bottom % PITCH).toBe(0);
    });
  }

  test('the same screen drag grows the shape more when zoomed out', ({ expect }) => {
    const zoomedOut = resizeEdge(0.5, initial, { x: 128, y: 128 }, { x: 1, y: 1 });
    const zoomedIn = resizeEdge(2, initial, { x: 128, y: 128 }, { x: 1, y: 1 });
    expect(zoomedOut.width).toBeGreaterThan(zoomedIn.width);
  });
});
