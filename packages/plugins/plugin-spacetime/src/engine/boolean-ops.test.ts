//
// Copyright 2026 DXOS.org
//

import type { ManifoldToplevel, Manifold } from 'manifold-3d';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { joinSolids, subtractSolids } from './boolean-ops';

describe('boolean-ops', () => {
  let wasm: ManifoldToplevel;

  beforeAll(async () => {
    const Module = await import('manifold-3d');
    wasm = await Module.default();
    wasm.setup();
  });

  afterAll(() => {});

  const makeCube = (offset: [number, number, number] = [0, 0, 0]): Manifold => {
    const cube = wasm.Manifold.cube([2, 2, 2], true);
    if (offset[0] === 0 && offset[1] === 0 && offset[2] === 0) {
      return cube;
    }
    const translated = cube.translate(offset);
    cube.delete();
    return translated;
  };

  describe('joinSolids', () => {
    test('joins two overlapping cubes into a single solid', ({ expect }) => {
      const solidA = makeCube();
      const solidB = makeCube([1, 0, 0]);
      const result = joinSolids(wasm, [solidA, solidB], [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
      ]);
      const bbox = result.solid.boundingBox();
      expect(bbox.min[0]).toBeCloseTo(-1, 1);
      expect(bbox.max[0]).toBeCloseTo(2, 1);
      expect(bbox.min[1]).toBeCloseTo(-1, 1);
      expect(bbox.max[1]).toBeCloseTo(1, 1);
      expect(result.solid.volume()).toBeCloseTo(12, 0);
      result.solid.delete();
      solidA.delete();
      solidB.delete();
    });

    test('joins two non-overlapping cubes', ({ expect }) => {
      const solidA = makeCube();
      const solidB = makeCube([5, 0, 0]);
      const result = joinSolids(wasm, [solidA, solidB], [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
      ]);
      expect(result.solid.volume()).toBeCloseTo(16, 0);
      result.solid.delete();
      solidA.delete();
      solidB.delete();
    });

    test('joins three cubes', ({ expect }) => {
      const solidA = makeCube();
      const solidB = makeCube([1, 0, 0]);
      const solidC = makeCube([0, 1, 0]);
      const result = joinSolids(wasm, [solidA, solidB, solidC], [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
      ]);
      const bbox = result.solid.boundingBox();
      expect(bbox.min[0]).toBeCloseTo(-1, 1);
      expect(bbox.max[0]).toBeCloseTo(2, 1);
      expect(bbox.max[1]).toBeCloseTo(2, 1);
      result.solid.delete();
      solidA.delete();
      solidB.delete();
      solidC.delete();
    });

    test('result position matches first solid position', ({ expect }) => {
      const solidA = makeCube();
      const solidB = makeCube([1, 0, 0]);
      const posA = { x: 3, y: 0, z: 0 };
      const posB = { x: 4, y: 0, z: 0 };
      const result = joinSolids(wasm, [solidA, solidB], [posA, posB]);
      expect(result.position.x).toBe(3);
      expect(result.position.y).toBe(0);
      expect(result.position.z).toBe(0);
      result.solid.delete();
      solidA.delete();
      solidB.delete();
    });
  });

  describe('subtractSolids', () => {
    test('subtracts overlapping cube from another', ({ expect }) => {
      const solidA = makeCube();
      const solidB = makeCube([1, 0, 0]);
      const result = subtractSolids(wasm, [solidA, solidB], [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
      ]);
      const bbox = result.solid.boundingBox();
      expect(bbox.min[0]).toBeCloseTo(-1, 1);
      expect(bbox.max[0]).toBeCloseTo(0, 1);
      expect(result.solid.volume()).toBeCloseTo(4, 0);
      result.solid.delete();
      solidA.delete();
      solidB.delete();
    });

    test('subtracts two cubes from first (A - B - C)', ({ expect }) => {
      const solidA = wasm.Manifold.cube([4, 2, 2], true);
      const solidB = makeCube([1, 0, 0]);
      const solidC = makeCube([-1, 0, 0]);
      const result = subtractSolids(wasm, [solidA, solidB, solidC], [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
      ]);
      expect(result.solid.volume()).toBeLessThan(16);
      result.solid.delete();
      solidA.delete();
      solidB.delete();
      solidC.delete();
    });

    test('subtracting non-overlapping cube leaves original intact', ({ expect }) => {
      const solidA = makeCube();
      const solidB = makeCube([10, 0, 0]);
      const result = subtractSolids(wasm, [solidA, solidB], [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
      ]);
      expect(result.solid.volume()).toBeCloseTo(8, 0);
      result.solid.delete();
      solidA.delete();
      solidB.delete();
    });

    test('result position matches first solid position', ({ expect }) => {
      const solidA = makeCube();
      const solidB = makeCube([1, 0, 0]);
      const posA = { x: 5, y: 2, z: 0 };
      const posB = { x: 6, y: 2, z: 0 };
      const result = subtractSolids(wasm, [solidA, solidB], [posA, posB]);
      expect(result.position.x).toBe(5);
      expect(result.position.y).toBe(2);
      expect(result.position.z).toBe(0);
      result.solid.delete();
      solidA.delete();
      solidB.delete();
    });
  });
});
