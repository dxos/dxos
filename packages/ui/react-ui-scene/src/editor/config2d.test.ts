//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { createFreehandProjection } from '@dxos/react-ui-canvas';
import { type LayoutIntent, type Scene, applyIntent } from '@dxos/scene';

import { createConfig2D } from './config2d.tsx';

const document: Scene.SceneDocument = {
  scenes: [{ id: 's', dim: '2d', layout: 'root', camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
  layouts: [
    {
      id: 'root',
      dim: '2d',
      elements: {
        a: { id: 'a', type: 'rect', center: { x: 100, y: 0 }, size: { width: 100, height: 100 } },
        b: { id: 'b', type: 'rect', center: { x: 500, y: 200 }, size: { width: 100, height: 100 } },
      },
    },
  ],
  models: [],
};

describe('config2d', () => {
  test('reset is actual size with the content centred in the view, not the origin', () => {
    const config = createConfig2D();
    const size = { width: 800, height: 600 };
    const camera = config.camera.reset({ x: 0, y: 0, zoom: 1 }, document, 'root', size);
    expect(camera.zoom).toBe(1);
    // The content's centre (300, 100) lands on the view's centre (400, 300).
    expect((300 + camera.x) * camera.zoom).toBe(400);
    expect((100 + camera.y) * camera.zoom).toBe(300);
  });
  test('a layout with a lattice snaps a move onto its cells while snapping is on', () => {
    const lattice: Scene.LayoutRecord2D = {
      id: 'grid',
      dim: '2d',
      lattice: { width: 256, height: 128, gutterX: 128, gutterY: 64 },
      elements: { a: { id: 'a', type: 'rect', center: { x: 0, y: 0 }, size: { width: 256, height: 128 } } },
    };
    const { constrain } = createConfig2D();
    const move: LayoutIntent = { kind: 'move', ids: ['a'], delta: { x: 300, y: 20 } };
    const snapped = constrain?.(lattice, move, { snap: true });
    expect(snapped && applyIntent(lattice, snapped).elements.a.center).toEqual({ x: 384, y: 0 });
    expect(constrain?.(lattice, move, { snap: false })).toBe(move);
    // A layout with no lattice is free.
    const { lattice: _lattice, ...free } = lattice;
    expect(constrain?.(free, move, { snap: true })).toBe(move);
    // A host's own projection owns the mode.
    expect(createConfig2D({ createProjection: createFreehandProjection }).constrain).toBeUndefined();
  });
});
