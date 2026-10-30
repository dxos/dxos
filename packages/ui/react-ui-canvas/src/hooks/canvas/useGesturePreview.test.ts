//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Drag, constrainIntent } from '../../engine/index.ts';
import { type Intent, type View } from '../../model/index.ts';
import { movePreview } from './useGesturePreview.ts';

const SPEC = { width: 256, height: 128, gutterX: 128, gutterY: 64 };

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
  test('on a lattice a move in flight draws the cell it lands on, not the pointer', ({ expect }) => {
    const projection = {
      lattice: SPEC,
      constrain: (intent: Intent) => constrainIntent(scene, intent, SPEC),
    };
    // Each step moves C a few pixels along a diagonal and every one lands it on the same cell, so the drawing holds still.
    const centres = [
      { x: 290, y: 150 },
      { x: 297, y: 153 },
      { x: 303, y: 157 },
    ].map((raw) => movePreview(scene, move(raw), projection, false).displayScene.nodes.c.center);
    expect(centres).toEqual([
      { x: 384, y: 384 },
      { x: 384, y: 384 },
      { x: 384, y: 384 },
    ]);
  });

  test('off a lattice a move in flight follows the pointer until it settles', ({ expect }) => {
    const raw = { x: 13, y: 7 };
    const drag = { ...move(raw), delta: { x: 16, y: 0 } };
    expect(movePreview(scene, drag, {}, false).displayScene.nodes.c.center).toEqual({ x: 13, y: 199 });
    expect(movePreview(scene, drag, {}, true).displayScene.nodes.c.center).toEqual({ x: 16, y: 192 });
  });
});
