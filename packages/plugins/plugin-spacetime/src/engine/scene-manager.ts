//
// Copyright 2026 DXOS.org
//

import { ArcRotateCamera, Color3, Color4, Engine, HemisphericLight, Scene, Vector3 } from '@babylonjs/core';

// oklch(98.5% 0 0) ≈ rgb(251, 251, 251), oklch(14.5% 0 0) ≈ rgb(18, 18, 18).
const BACKGROUND_LIGHT = new Color4(0.984, 0.984, 0.984, 1);
const BACKGROUND_DARK = new Color4(0.071, 0.071, 0.071, 1);

export type SceneManagerOptions = {
  canvas: HTMLCanvasElement;
  themeMode: 'dark' | 'light';
};

/**
 * Manages the Babylon.js engine, scene, camera, and lighting.
 */
export class SceneManager {
  private readonly _engine: Engine;
  private readonly _scene: Scene;
  private readonly _camera: ArcRotateCamera;

  constructor({ canvas, themeMode }: SceneManagerOptions) {
    this._engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      adaptToDeviceRatio: true,
    });
    this._scene = new Scene(this._engine);
    this._scene.clearColor = themeMode === 'dark' ? BACKGROUND_DARK : BACKGROUND_LIGHT;

    this._camera = new ArcRotateCamera('camera', -Math.PI / 4, Math.PI / 3, 10, Vector3.Zero(), this._scene);
    this._camera.attachControl(canvas, true);
    this._camera.lowerRadiusLimit = 2;
    this._camera.upperRadiusLimit = 50;
    this._camera.wheelPrecision = 20;

    // Light direction points downward (from above).
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this._scene);
    light.intensity = 0.8;
    // Ground color provides fill light from below.
    light.groundColor = themeMode === 'dark' ? new Color3(0.1, 0.1, 0.1) : new Color3(0.6, 0.6, 0.6);

    this._engine.runRenderLoop(() => {
      this._scene.render();
    });
  }

  get engine(): Engine {
    return this._engine;
  }

  get scene(): Scene {
    return this._scene;
  }

  get camera(): ArcRotateCamera {
    return this._camera;
  }

  setThemeMode(themeMode: 'dark' | 'light'): void {
    this._scene.clearColor = themeMode === 'dark' ? BACKGROUND_DARK : BACKGROUND_LIGHT;
  }

  resize(): void {
    this._engine.resize();
  }

  dispose(): void {
    this._engine.stopRenderLoop();
    this._scene.dispose();
    this._engine.dispose();
  }
}
