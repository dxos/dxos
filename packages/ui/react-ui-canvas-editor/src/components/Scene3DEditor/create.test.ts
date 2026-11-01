//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type Scene } from '@dxos/scene';

import { createdElement, dragBase, dragHeight, placedElement, placedOnBase, sizesInOneStep } from './create.ts';

const CAMERA: Scene.Camera3D = {
  target: { x: 0, y: 0, z: 0 },
  yaw: 0,
  pitch: 0,
  distance: 10,
  fov: 0.8,
  projection: 'orthographic',
};
const VIEWPORT = { width: 800, height: 600 };

describe('drag to create', () => {
  test('a ground drag sweeps the base as 2D sweeps a box: the snapped corners span it', () => {
    const base = dragBase({ x: 0.2, y: 0, z: 0.1 }, { x: 2.9, y: 0, z: 1.8 }, 1);
    expect(base).toEqual({ center: { x: 1.5, y: 0, z: 1 }, width: 3, depth: 2 });
    expect(dragBase({ x: 0, y: 0, z: 0 }, { x: 0.2, y: 0, z: 0 }, 1)).toBeUndefined();
  });

  test('the pointer raised over the base sets the height, snapped, and never below one step', () => {
    const base = { center: { x: 0, y: 0, z: 0 }, width: 2, depth: 2 };
    const perUnit = VIEWPORT.height / 2 / (CAMERA.distance * Math.tan(CAMERA.fov / 2));
    expect(dragHeight(base, 3 * perUnit, CAMERA, VIEWPORT, 1)).toBeCloseTo(3);
    expect(dragHeight(base, -50, CAMERA, VIEWPORT, 1)).toBe(1);
  });

  test('a box rests on the ground at its height; a sphere takes the base as its diameter', () => {
    const base = { center: { x: 1, y: 0, z: 1 }, width: 2, depth: 4 };
    expect(createdElement('box-1', 'cube', base, 3)).toEqual({
      id: 'box-1',
      type: 'cube',
      center: { x: 1, y: 1.5, z: 1 },
      scale: { x: 2, y: 3, z: 4 },
    });
    expect(createdElement('ball-1', 'sphere', base, undefined)).toEqual({
      id: 'ball-1',
      type: 'sphere',
      center: { x: 1, y: 2, z: 1 },
      scale: { x: 4, y: 4, z: 4 },
    });
  });

  test('a placed object takes its model scale and rests on the ground, as a created shape does', () => {
    const point = { x: 1, y: 0, z: 2 };
    const mesh = { key: 'k', positions: [0, -0.25, 0, 1, 0.25, 0, 0, 0, 1], indices: [0, 1, 2] };
    const race = { id: 'race', type: 'mesh', scale: { x: 5, y: 5, z: 5 }, props: { mesh } };
    expect(placedElement('race-1', 'race', race, point)).toEqual({
      id: 'race-1',
      object: 'race',
      center: { x: 1, y: 1.25, z: 2 },
      scale: { x: 5, y: 5, z: 5 },
    });
    expect(placedElement('lamp-1', 'lamp', { id: 'lamp', type: 'cylinder' }, point)).toEqual({
      id: 'lamp-1',
      object: 'lamp',
      center: { x: 1, y: 0.5, z: 2 },
    });
  });

  test('a library object dragged out with its aspect locked scales evenly to cover the base, and stands on it', () => {
    // One unit wide, half a unit high and two deep.
    const mesh = { key: 'k', positions: [-0.5, -0.25, -1, 0.5, 0.25, 1, 0, 0, 0], indices: [0, 1, 2] };
    const taxi = { id: 'taxi', type: 'mesh', lockAspect: true, scale: { x: 5, y: 5, z: 5 }, props: { mesh } };
    const base = { center: { x: 1, y: 0, z: 1 }, width: 3, depth: 4 };
    expect(placedOnBase('taxi-1', 'taxi', taxi, base, undefined)).toEqual({
      id: 'taxi-1',
      object: 'taxi',
      center: { x: 1, y: 0.75, z: 1 },
      scale: { x: 3, y: 3, z: 3 },
    });
  });

  test('an object whose aspect is free stretches to the base and the dragged height', () => {
    const base = { center: { x: 1, y: 0, z: 1 }, width: 3, depth: 4 };
    expect(placedOnBase('lamp-1', 'lamp', { id: 'lamp', type: 'cylinder' }, base, 2)).toEqual({
      id: 'lamp-1',
      object: 'lamp',
      center: { x: 1, y: 1, z: 1 },
      scale: { x: 3, y: 2, z: 4 },
    });
  });

  test('a sphere and an aspect-locked object size from the base alone; other shapes take a height too', () => {
    expect(sizesInOneStep('sphere')).toBe(true);
    expect(sizesInOneStep('cube')).toBe(false);
    expect(sizesInOneStep('mesh', { id: 'taxi', type: 'mesh', lockAspect: true })).toBe(true);
    expect(sizesInOneStep('mesh', { id: 'rock', type: 'mesh' })).toBe(false);
  });
});
