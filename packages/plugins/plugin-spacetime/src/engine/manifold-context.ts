//
// Copyright 2026 DXOS.org
//

import type { ManifoldToplevel } from 'manifold-3d';

// Vite resolves this to the correct URL for the WASM asset at build/serve time.
// @ts-ignore - Vite-specific ?url import suffix.
import wasmUrl from 'manifold-3d/manifold.wasm?url';

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
      const wasm = await Module.default({
        locateFile: () => wasmUrl,
      });
      // setup() must be called to initialize high-level API (cube, sphere, union, etc.).
      wasm.setup();
      manifoldInstance = wasm;
      return wasm;
    })();
  }

  return loadingPromise;
};
