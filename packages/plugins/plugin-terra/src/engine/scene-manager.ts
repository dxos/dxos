//
// Copyright 2026 DXOS.org
//

import '@babylonjs/core/Meshes/thinInstanceMesh';

import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { type Camera } from '@babylonjs/core/Cameras/camera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Color4, Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreatePolyhedron } from '@babylonjs/core/Meshes/Builders/polyhedronBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Scene } from '@babylonjs/core/scene';

import { type Planet } from './generate-planet';
import { type Vec3 } from './noise';
import { palette } from './palette';

// Neutral space backdrop; theme-derived background is the container's concern.
const BACKGROUND_COLOR = new Color4(0.043, 0.051, 0.071, 1);

const clampChannel = (value: number): number => Math.min(1, Math.max(0, value));

const tint = (color: Vec3, delta: number): Color3 =>
  new Color3(clampChannel(color[0] + delta), clampChannel(color[1] + delta), clampChannel(color[2] + delta));

/** Orients a thin-instance matrix so local up aligns with the surface normal. */
const orient = (position: Vec3, normal: Vec3, scaleFactor: number): Matrix => {
  const up = new Vector3(normal[0], normal[1], normal[2]);
  const rotation = new Quaternion();
  Quaternion.FromUnitVectorsToRef(Vector3.Up(), up, rotation);
  return Matrix.Compose(
    new Vector3(scaleFactor, scaleFactor, scaleFactor),
    rotation,
    new Vector3(position[0], position[1], position[2]),
  );
};

/**
 * Owns the Babylon engine/scene/camera for a rendered planet and exposes a
 * render-from-data interface so the caller never touches Babylon directly.
 */
export class SceneManager {
  readonly #engine: Engine;
  readonly #scene: Scene;
  readonly #camera: ArcRotateCamera;
  readonly #canvas: HTMLCanvasElement;

  readonly #handlePointerDown = (event: PointerEvent): void => {
    // Panning targets the orbit camera specifically; while another camera is rendering, a
    // shift-drag would silently reposition a view nobody can see.
    if (!event.shiftKey || this.#scene.activeCamera !== this.#camera) {
      return;
    }
    this.#panning = true;
    this.#lastPointerX = event.clientX;
    this.#lastPointerY = event.clientY;
    this.#camera.detachControl();
  };

  readonly #handlePointerUp = (): void => {
    if (!this.#panning) {
      return;
    }
    this.#panning = false;
    this.#camera.attachControl(this.#canvas, true);
  };

  readonly #handlePointerMove = (event: PointerEvent): void => {
    if (!this.#panning) {
      return;
    }
    const dx = event.clientX - this.#lastPointerX;
    const dy = event.clientY - this.#lastPointerY;
    this.#lastPointerX = event.clientX;
    this.#lastPointerY = event.clientY;
    // Pan speed scales with radius so the drag feels consistent whether zoomed in or out.
    const speed = this.#camera.radius * 0.0018;
    const right = this.#camera.getDirection(Vector3.Right());
    const up = this.#camera.getDirection(Vector3.Up());
    this.#camera.target.addInPlace(right.scale(-dx * speed));
    this.#camera.target.addInPlace(up.scale(dy * speed));
  };

  readonly #handleResize = (): void => {
    this.#engine.resize();
  };

  // Declared (not initialized) here because it observes `#canvas`, which is only
  // assigned in the constructor body, after field initializers run.
  readonly #resizeObserver: ResizeObserver;

  #planetMesh: Mesh | null = null;
  #waterMesh: Mesh | null = null;
  #scatterBases: Mesh[] = [];
  #waterSheen = false;
  #panning = false;
  #lastPointerX = 0;
  #lastPointerY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    this.#engine = new Engine(canvas, true, { adaptToDeviceRatio: true });
    this.#scene = new Scene(this.#engine);
    this.#scene.clearColor = BACKGROUND_COLOR;

    this.#camera = new ArcRotateCamera('camera', Math.PI * 0.6, Math.PI * 0.42, 6.5, Vector3.Zero(), this.#scene);
    this.#camera.attachControl(canvas, true);
    this.#camera.wheelPrecision = 40;
    this.#camera.lowerRadiusLimit = 2.6;
    this.#camera.upperRadiusLimit = 20;
    this.#camera.minZ = 0.01;
    // Unclamp pole limits so orbit can pass continuously over the poles.
    this.#camera.lowerBetaLimit = null;
    this.#camera.upperBetaLimit = null;
    this.#camera.allowUpsideDown = true;

    const key = new HemisphericLight('key', new Vector3(0.5, 1, 0.4), this.#scene);
    key.intensity = 0.95;
    key.groundColor = new Color3(0.35, 0.37, 0.42);
    const fill = new HemisphericLight('fill', new Vector3(-0.6, -0.3, -0.7), this.#scene);
    fill.intensity = 0.25;

    canvas.addEventListener('pointerdown', this.#handlePointerDown);
    window.addEventListener('pointerup', this.#handlePointerUp);
    window.addEventListener('pointermove', this.#handlePointerMove);
    window.addEventListener('resize', this.#handleResize);

    // Composer plank/sidebar resizes don't fire `window.resize`; the canvas's CSS size
    // (absolute inset-0) follows its container regardless, so watch the container directly.
    this.#resizeObserver = new ResizeObserver(this.#handleResize);
    this.#resizeObserver.observe(canvas);

    this.#engine.runRenderLoop(() => this.#scene.render());
  }

  get scene(): Scene {
    return this.#scene;
  }

  get engine(): Engine {
    return this.#engine;
  }

  /**
   * Makes `camera` the rendering camera, or restores the orbit camera when passed `null`. The orbit
   * camera's pointer control is detached while another camera is active so a drag cannot silently
   * move an orbit view nobody is looking through, and the shift-drag pan handlers no-op for the
   * same reason.
   */
  setActiveCamera(camera: Camera | null): void {
    if (camera) {
      this.#camera.detachControl();
      this.#scene.activeCamera = camera;
    } else {
      this.#scene.activeCamera = this.#camera;
      this.#camera.attachControl(this.#canvas, true);
    }
  }

  setWaterSheen(enabled: boolean): void {
    this.#waterSheen = enabled;
    this.#waterMesh?.setEnabled(enabled);
  }

  render(planet: Planet): void {
    this.#disposeMeshes();
    this.#planetMesh = this.#buildTerrain(planet);
    this.#waterMesh = this.#buildWater(planet);
    this.#scatterBases = this.#buildScatter(planet);
  }

  dispose(): void {
    this.#canvas.removeEventListener('pointerdown', this.#handlePointerDown);
    window.removeEventListener('pointerup', this.#handlePointerUp);
    window.removeEventListener('pointermove', this.#handlePointerMove);
    window.removeEventListener('resize', this.#handleResize);
    this.#resizeObserver.disconnect();
    this.#engine.stopRenderLoop();
    this.#disposeMeshes();
    this.#scene.dispose();
    this.#engine.dispose();
  }

  #disposeMeshes(): void {
    // Mesh.dispose() defaults to leaving materials alive; each regenerate would
    // otherwise orphan the prior planetMat/waterMat/treeMat*/rockMat* in scene.materials.
    this.#planetMesh?.dispose(false, true);
    this.#waterMesh?.dispose(false, true);
    this.#scatterBases.forEach((mesh) => mesh.dispose(false, true));
    this.#planetMesh = null;
    this.#waterMesh = null;
    this.#scatterBases = [];
  }

  #matte(name: string): StandardMaterial {
    const material = new StandardMaterial(name, this.#scene);
    material.specularColor = new Color3(0, 0, 0); // NPR: no highlights.
    return material;
  }

  #buildTerrain(planet: Planet): Mesh {
    const mesh = new Mesh('planet', this.#scene);
    const vertexData = new VertexData();
    vertexData.positions = planet.mesh.positions;
    vertexData.normals = planet.mesh.normals;
    vertexData.colors = planet.mesh.colors;

    // Babylon is left-handed; the generator's winding is right-handed and reads as
    // back-facing, so reverse each triangle to make the outer hemisphere front-facing.
    const triangleCount = planet.mesh.positions.length / 9;
    const indices = new Array<number>(triangleCount * 3);
    for (let triangle = 0; triangle < triangleCount; triangle++) {
      indices[triangle * 3] = triangle * 3;
      indices[triangle * 3 + 1] = triangle * 3 + 2;
      indices[triangle * 3 + 2] = triangle * 3 + 1;
    }
    vertexData.indices = indices;
    vertexData.applyToMesh(mesh);

    const material = this.#matte('planetMat');
    material.diffuseColor = new Color3(1, 1, 1);
    material.emissiveColor = new Color3(0, 0, 0);
    mesh.material = material;
    mesh.useVertexColors = true;
    return mesh;
  }

  #buildWater(planet: Planet): Mesh {
    const water = CreateSphere('water', { diameter: planet.seaRadius * 2.002, segments: 64 }, this.#scene);
    const material = this.#matte('waterMat');
    material.diffuseColor = new Color3(0.18, 0.4, 0.55);
    material.alpha = 0.4;
    // Depth pre-pass so the translucent sheen occludes the far hemisphere/interior
    // instead of letting geometry behind it bleed through.
    material.needDepthPrePass = true;
    water.material = material;
    water.setEnabled(this.#waterSheen);
    return water;
  }

  #buildScatter(planet: Planet): Mesh[] {
    const trees = new Map<number, Matrix[]>();
    const rocks = new Map<number, Matrix[]>();
    for (const item of planet.scatter) {
      const bucket = item.type === 'tree' ? trees : rocks;
      const matrices = bucket.get(item.variant) ?? [];
      bucket.set(item.variant, matrices);
      // Sink the base slightly into the surface so it doesn't float above the terrain.
      const position: Vec3 = [
        item.position[0] - item.normal[0] * 0.05,
        item.position[1] - item.normal[1] * 0.05,
        item.position[2] - item.normal[2] * 0.05,
      ];
      matrices.push(orient(position, item.normal, item.scale * (item.type === 'tree' ? 0.05 : 0.06)));
    }

    const bases: Mesh[] = [];
    const emit = (map: Map<number, Matrix[]>, make: (variant: number) => Mesh): void => {
      for (const [variant, matrices] of map) {
        const base = make(variant);
        const buffer = new Float32Array(matrices.length * 16);
        matrices.forEach((matrix, index) => matrix.copyToArray(buffer, index * 16));
        base.thinInstanceSetBuffer('matrix', buffer, 16, true);
        base.isVisible = true;
        bases.push(base);
      }
    };
    emit(trees, (variant) => this.#makeTreeBase(variant));
    emit(rocks, (variant) => this.#makeRockBase(variant));
    return bases;
  }

  #makeTreeBase(variant: number): Mesh {
    const trunk = CreateCylinder(
      `trunk${variant}`,
      { height: 0.5, diameterTop: 0.08, diameterBottom: 0.12 },
      this.#scene,
    );
    const canopyHeight = 0.7 + (variant % 3) * 0.25;
    const canopy = CreateCylinder(
      `canopy${variant}`,
      { height: canopyHeight, diameterTop: 0, diameterBottom: 0.6 - (variant % 2) * 0.15, tessellation: 6 },
      this.#scene,
    );
    canopy.position.y = 0.35 + canopyHeight / 2;
    trunk.position.y = 0.25;
    const merged = Mesh.MergeMeshes([trunk, canopy], true, true, undefined, false, false);
    if (!merged) {
      throw new Error('Failed to merge tree base mesh.');
    }
    merged.name = `tree${variant}`;
    merged.convertToFlatShadedMesh();
    const material = this.#matte(`treeMat${variant}`);
    material.diffuseColor = tint(variant % 2 ? palette.forest : palette.grass, -0.05 + (variant % 3) * 0.03);
    merged.material = material;
    merged.isVisible = false;
    return merged;
  }

  #makeRockBase(variant: number): Mesh {
    const rock = CreatePolyhedron(`rock${variant}`, { type: variant % 4, size: 0.18 }, this.#scene);
    rock.convertToFlatShadedMesh();
    const material = this.#matte(`rockMat${variant}`);
    material.diffuseColor = tint(palette.rock, -0.05 + (variant % 3) * 0.04);
    rock.material = material;
    rock.isVisible = false;
    return rock;
  }
}
