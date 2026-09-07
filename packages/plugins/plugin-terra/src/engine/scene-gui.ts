//
// Copyright 2026 DXOS.org
//

import { type Scene } from '@babylonjs/core/scene';
import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';

/**
 * Creates a fullscreen GUI layer that survives being disposed before its first frame settles: on a
 * size change the texture queues `update()` through a timer it never cancels, so a layer torn down
 * in between (a story unmounting, a plank closing) would throw from that timer against a null engine.
 */
export const createFullscreenUi = (name: string, scene: Scene): AdvancedDynamicTexture => {
  const adt = AdvancedDynamicTexture.CreateFullscreenUI(name, true, scene);
  const update = adt.update.bind(adt);
  let disposed = false;
  adt.onDisposeObservable.addOnce(() => {
    disposed = true;
  });
  adt.update = (invertY, premulAlpha, allowGPUOptimization) => {
    if (!disposed) {
      update(invertY, premulAlpha, allowGPUOptimization);
    }
  };
  return adt;
};
