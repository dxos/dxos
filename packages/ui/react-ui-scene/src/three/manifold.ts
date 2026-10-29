//
// Copyright 2026 DXOS.org
//

import type { ManifoldToplevel } from 'manifold-3d';
// Vite resolves the WASM asset's URL at build and serve time.
import wasmUrl from 'manifold-3d/manifold.wasm?url';

import { log } from '@dxos/log';

import { type GeometrySource, type MeshData } from './renderer.ts';
import { evaluateSolid, fallbackMesh, primitiveSolid, toMeshData } from './solid.ts';

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
 * Geometry Babylon has no builder for: solids from their operation trees, and rounded cubes at unit size. Each result is
 * cached per scene record, so a frame that only moves the camera does not rebuild it.
 */
export const manifoldGeometry = (wasm: ManifoldToplevel): GeometrySource => {
  const cache = new WeakMap<object, Map<string, MeshData | undefined>>();
  const reported = new Set<string>();
  return (item) => {
    const isSolid = item.kind === 'solid';
    const isRounded = item.kind === 'cube' && item.style?.rounded === true;
    if (!isSolid && !isRounded) {
      return undefined;
    }
    let meshes = cache.get(item.scene);
    if (!meshes) {
      meshes = new Map();
      cache.set(item.scene, meshes);
    }
    if (!meshes.has(item.id)) {
      if (isRounded) {
        const solid = primitiveSolid(wasm, 'cube', { x: 1, y: 1, z: 1 }, true);
        meshes.set(item.id, toMeshData(solid));
        solid.delete();
      } else {
        const result = evaluateSolid(item.scene, item.id, wasm);
        if ('error' in result && !reported.has(item.key)) {
          reported.add(item.key);
          log.warn('solid draws its operands instead', { solid: item.key, error: result.error });
        }
        meshes.set(item.id, 'mesh' in result ? result.mesh : fallbackMesh(item.scene, item.id, wasm));
      }
    }
    return meshes.get(item.id);
  };
};
