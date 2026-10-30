//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Drag, constrainIntent } from '../../engine/index.ts';
import { type Intent, type View } from '../../model/index.ts';
import { movePreview } from './useGesturePreview.ts';

const SPEC = { width: 256, height: 128, gutterX: 128, gutterY: 64 };

const DETENT = 8;

const box = (id: string, x: number, y: number) => ({
  type: 'rect',
  id,
  z: 'a0',
  center: { x, y },
  size: { width: 256, height: 128 },
});

const scene: View = { id: 'root', nodes: { a: box('a', 0, 0), c: box('c', 0, 192) }, links: {} };

const move = (raw: { x: number; y: number }): Extract<Drag, { kind: 'move' }> => ({
  kind: 'move',
  ids: ['c'],
  origin: { x: 0, y: 192 },
  anchor: { x: 0, y: 192 },
  delta: raw,
  raw,
});

describe('movePreview', () => {
  test('on a lattice a move holds each axis on its landing cell within the detent and follows the pointer outside it', ({
    expect,
  }) => {
    const projection = {
      constrain: (intent: Intent) => constrainIntent(scene, intent, SPEC),
    };
    const centre = (delta: { x: number; y: number }) =>
      movePreview(scene, move(delta), projection, DETENT).displayScene.nodes.c.center;
    // Far from the landing cell (384, 384) on both axes: C follows the pointer.
    expect(centre({ x: 290, y: 150 })).toEqual({ x: 290, y: 342 });
    // Within the detent on both axes: C sits on the cell.
    expect(centre({ x: 380, y: 190 })).toEqual({ x: 384, y: 384 });
    // Within it on x only: x holds on the cell's column while y follows.
    expect(centre({ x: 380, y: 150 })).toEqual({ x: 384, y: 342 });
  });

  test('off a lattice a move draws the offset the snap gave it', ({ expect }) => {
    expect(movePreview(scene, move({ x: 13, y: 7 }), {}, DETENT).displayScene.nodes.c.center).toEqual({
      x: 13,
      y: 199,
    });
  });
});
