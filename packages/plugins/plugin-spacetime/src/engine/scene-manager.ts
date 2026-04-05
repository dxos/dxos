//
// Copyright 2026 DXOS.org
//

import {
  ArcRotateCamera,
  AxesViewer,
  Color3,
  Color4,
  CreateLineSystem,
  Engine,
  HemisphericLight,
  type Mesh,
  Scene,
  Vector3,
} from '@babylonjs/core';

/**
 * Reads the computed background-color from an element and converts to Color4.
 * Uses a temporary canvas to resolve any CSS color format (oklch, rgb, etc.) to rgba.
 */
const resolveBackgroundColor = (element: HTMLElement): Color4 => {
  const raw = getComputedStyle(element).backgroundColor;
  if (!raw || raw === 'transparent' || raw === 'rgba(0, 0, 0, 0)') {
    return new Color4(0.97, 0.97, 0.97, 1);
  }

  // Use a 2d canvas to resolve any CSS color to rgba.
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.fillStyle = raw;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return new Color4(r / 255, g / 255, b / 255, 1);
};

const GRID_SIZE = 10;
const GRID_STEP = 1;
const GRID_COLOR = new Color3(0.5, 0.5, 0.5);
const GRID_ALPHA = 0.3;

/** Creates a transparent grid on the Y=0 ground plane. */
const createGroundGrid = (scene: Scene): Mesh => {
  const lines: Vector3[][] = [];
  const half = GRID_SIZE / 2;

  for (let step = -half; step <= half; step += GRID_STEP) {
    // Lines along Z axis.
    lines.push([new Vector3(step, 0, -half), new Vector3(step, 0, half)]);
    // Lines along X axis.
    lines.push([new Vector3(-half, 0, step), new Vector3(half, 0, step)]);
  }

  const grid = CreateLineSystem('ground-grid', { lines }, scene);
  grid.color = GRID_COLOR;
  grid.alpha = GRID_ALPHA;
  grid.isPickable = false;
  return grid;
};

export type SceneManagerOptions = {
  canvas: HTMLCanvasElement;
};

/**
 * Manages the Babylon.js engine, scene, camera, and lighting.
 */
export class SceneManager {
  private readonly _engine: Engine;
  private readonly _scene: Scene;
  private readonly _camera: ArcRotateCamera;
  private _axesViewer: AxesViewer | null = null;
  private _gridMesh: Mesh | null = null;

  constructor({ canvas }: SceneManagerOptions) {
    this._engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      adaptToDeviceRatio: true,
    });
    this._scene = new Scene(this._engine);

    // Read background color from the container div (has bg-(--surface-bg) class).
    const container = canvas.parentElement;
    this._scene.clearColor = container ? resolveBackgroundColor(container) : new Color4(0.97, 0.97, 0.97, 1);

    this._camera = new ArcRotateCamera('camera', -Math.PI / 4, Math.PI / 3, 10, Vector3.Zero(), this._scene);
    this._camera.attachControl(canvas, true);
    this._camera.lowerRadiusLimit = 2;
    this._camera.upperRadiusLimit = 50;
    this._camera.wheelPrecision = 20;

    // HemisphericLight direction = vector toward the sky.
    // Surfaces facing the sky get diffuse; surfaces facing away get groundColor.
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this._scene);
    light.intensity = 1.0;
    // Bright ground color so downward-facing surfaces aren't black.
    light.groundColor = new Color3(0.4, 0.4, 0.4);

    this._gridMesh = createGroundGrid(this._scene);

    this._engine.runRenderLoop(() => {
      this._scene.render();
    });
  }

  get engine(): Engine {
    return this._engine;
  }

  get gridMesh(): Mesh | null {
    return this._gridMesh;
  }

  get scene(): Scene {
    return this._scene;
  }

  get camera(): ArcRotateCamera {
    return this._camera;
  }

  set showAxes(show: boolean) {
    if (show && !this._axesViewer) {
      this._axesViewer = new AxesViewer(this._scene, 0.5);
    } else if (!show && this._axesViewer) {
      this._axesViewer.dispose();
      this._axesViewer = null;
    }
  }

  get showAxes(): boolean {
    return this._axesViewer !== null;
  }

  set showGrid(show: boolean) {
    if (show && !this._gridMesh) {
      this._gridMesh = createGroundGrid(this._scene);
    } else if (!show && this._gridMesh) {
      this._gridMesh.dispose();
      this._gridMesh = null;
    }
  }

  get showGrid(): boolean {
    return this._gridMesh !== null;
  }

  get fps(): number {
    return this._engine.getFps();
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
