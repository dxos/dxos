//
// Copyright 2026 DXOS.org
//

import type { ManifoldToplevel } from 'manifold-3d';

let manifoldInstance: ManifoldToplevel | null = null;
let loadingPromise: Promise<ManifoldToplevel> | null = null;

/**
 * Lazily loads and returns the Manifold WASM module singleton.
 */
export const getManifold = async (): Promise<ManifoldToplevel> => {
  if (manifoldInstance) {
    return manifoldInstance;
  }

  if (!loadingPromise) {
    loadingPromise = (async () => {
      const Module = await import('manifold-3d');
      const wasm = await Module.default();
      manifoldInstance = wasm;
      return wasm;
    })();
  }

  return loadingPromise;
};
