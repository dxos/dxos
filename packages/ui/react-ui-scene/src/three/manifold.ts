//
// Copyright 2026 DXOS.org
//

import type { ManifoldToplevel } from 'manifold-3d';
// Vite resolves the WASM asset's URL at build and serve time.
import wasmUrl from 'manifold-3d/manifold.wasm?url';

import { log } from '@dxos/log';

import { type GeometrySource, type MeshData } from './renderer.ts';
import { evaluateSolid, fallbackMesh, primitiveSolid, solidKey, toMeshData } from './solid.ts';

let loading: Promise<ManifoldToplevel> | undefined;

/** Loads the Manifold WASM module once, on first use, since most scenes have no solids. */
export const loadManifold = (): Promise<ManifoldToplevel> => {
  loading ??= import('manifold-3d').then(async (module) => {
    const wasm = await module.default({ locateFile: () => wasmUrl });
    wasm.setup();
    return wasm;
  });
  return loading;
};

/**
 * Geometry Babylon has no builder for: solids from their operation trees, and rounded cubes at unit size. Results are
 * cached by the elements they are built from, so a frame that changes nothing a solid uses does not rebuild it.
 */
export const manifoldGeometry = (wasm: ManifoldToplevel): GeometrySource => {
  const solids = new Map<string, MeshData | undefined>();
  const reported = new Set<string>();
  let roundedCube: MeshData | undefined;
  return (item) => {
    if (item.kind === 'cube' && item.style?.rounded === true) {
      if (!roundedCube) {
        const solid = primitiveSolid(wasm, 'cube', { x: 1, y: 1, z: 1 }, true);
        roundedCube = toMeshData(solid);
        solid.delete();
      }
      return roundedCube;
    }
    if (item.kind !== 'solid') {
      return undefined;
    }
    const key = solidKey(item.scene, item.id);
    if (!solids.has(key)) {
      const result = evaluateSolid(item.scene, item.id, wasm);
      if ('error' in result && !reported.has(item.key)) {
        reported.add(item.key);
        log.warn('solid draws its operands instead', { solid: item.key, error: result.error });
      }
      solids.set(key, 'mesh' in result ? result.mesh : fallbackMesh(item.scene, item.id, wasm));
    }
    return solids.get(key);
  };
};
