//
// Copyright 2026 DXOS.org
//

import { ArcRotateCamera, Color4, Engine, HemisphericLight, Scene, Vector3 } from '@babylonjs/core';

export type SceneManagerOptions = {
  canvas: HTMLCanvasElement;
};

/**
 * Resolves a CSS custom property to an rgba Color4.
 */
const resolveCssColor = (canvas: HTMLCanvasElement, property: string): Color4 => {
  const raw = getComputedStyle(canvas).getPropertyValue(property).trim();
  if (!raw) {
    return new Color4(0.97, 0.97, 0.97, 1);
  }

  // Parse oklch(...) or other color formats via a temporary element.
  const temp = document.createElement('div');
  temp.style.color = raw;
  document.body.appendChild(temp);
  const computed = getComputedStyle(temp).color;
  document.body.removeChild(temp);

  const match = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return new Color4(Number(match[1]) / 255, Number(match[2]) / 255, Number(match[3]) / 255, 1);
  }

  return new Color4(0.97, 0.97, 0.97, 1);
};

/**
 * Manages the Babylon.js engine, scene, camera, and lighting.
 */
export class SceneManager {
  private readonly _engine: Engine;
  private readonly _scene: Scene;
  private readonly _camera: ArcRotateCamera;

  constructor({ canvas }: SceneManagerOptions) {
    this._engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      adaptToDeviceRatio: true,
    });
    this._scene = new Scene(this._engine);
    this._scene.clearColor = resolveCssColor(canvas, '--surface-bg');

    this._camera = new ArcRotateCamera('camera', -Math.PI / 4, Math.PI / 3, 10, Vector3.Zero(), this._scene);
    this._camera.attachControl(canvas, true);
    this._camera.lowerRadiusLimit = 2;
    this._camera.upperRadiusLimit = 50;
    this._camera.wheelPrecision = 20;

    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this._scene);
    light.intensity = 0.8;

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

  resize(): void {
    this._engine.resize();
  }

  dispose(): void {
    this._engine.stopRenderLoop();
    this._scene.dispose();
    this._engine.dispose();
  }
}
