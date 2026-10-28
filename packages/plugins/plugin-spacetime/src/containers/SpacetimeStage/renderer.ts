//
// Copyright 2026 DXOS.org
//

//
// The Babylon side of the spacetime stage: one engine with no render loop, drawn once per sample (F-6.1), so the
// frame on screen is always the frame for the clock's time and export can capture it after `render` returns.
//

import {
  ArcRotateCamera,
  Color3,
  Color4,
  CreateBox,
  CreateCylinder,
  CreateIcoSphere,
  CreateLines,
  CreateSphere,
  DirectionalLight,
  Engine,
  HemisphericLight,
  type LinesMesh,
  type Material,
  Matrix,
  Mesh,
  Quaternion,
  Scene,
  type ShaderMaterial,
  StandardMaterial,
  Vector3,
  VertexData,
} from '@babylonjs/core';

import { type Instance3D } from '@dxos/animation';
import type * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';

import { Model, type Scene as SceneType } from '#types';

import { BETA_LIMIT, type ObjectState, type OrbitCamera, STAGE_FOV } from '../../animator/index.ts';
import {
  LATTICE_OPACITY,
  PRESENTATION_BACKGROUND,
  RIM_STRENGTH,
  createLatticeMaterial,
  createRimMaterial,
  createSurfaceMaterial,
  setLattice,
  setRim,
  setSurface,
} from './materials.ts';

/** The radius of the faint lattice sphere the presentation look draws behind everything. */
const BACKDROP_RADIUS = 4000;

/** One scene object as drawn: its surface, and on a see-through shell its rim and lattice. */
type ObjectMeshes = {
  surface: Mesh;
  material: Material;
  rim?: { mesh: Mesh; material: ShaderMaterial };
  lattice?: { mesh: Mesh; material: StandardMaterial };
  /** The object's opacity at rest; below 1 it is a shell. */
  rest: number;
};

export type StageRendererOptions = {
  canvas: HTMLCanvasElement;
  presentation: boolean;
  /** The CAD background, read from the surface the stage sits on. */
  background: string;
};

/** Draws a spacetime scene at sampled states; never reads the clock and never writes ECHO. */
export class StageRenderer {
  readonly #engine: Engine;
  readonly #scene: Scene;
  readonly #camera: ArcRotateCamera;
  readonly #presentation: boolean;
  readonly #objects = new Map<string, ObjectMeshes>();
  readonly #links = new Map<string, LinesMesh>();
  readonly #instances: Record<Instance3D['primitive'], Mesh>;

  constructor({ canvas, presentation, background }: StageRendererOptions) {
    this.#presentation = presentation;
    this.#engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, adaptToDeviceRatio: true });
    this.#scene = new Scene(this.#engine);
    this.#scene.clearColor = Color4.FromHexString(`${presentation ? PRESENTATION_BACKGROUND : background}ff`);
    // Dithering keeps the smooth shading of large spheres from banding in 8-bit colour (F-6.6).
    this.#scene.imageProcessingConfiguration.ditheringEnabled = true;

    this.#camera = new ArcRotateCamera('camera', 0, Math.PI / 3, 10, Vector3.Zero(), this.#scene);
    this.#camera.fov = STAGE_FOV;
    this.#camera.minZ = 0.05;
    this.#camera.maxZ = BACKDROP_RADIUS * 4;
    this.#camera.lowerBetaLimit = BETA_LIMIT;
    this.#camera.upperBetaLimit = Math.PI - BETA_LIMIT;
    this.#camera.lowerRadiusLimit = null;
    this.#camera.upperRadiusLimit = null;

    if (presentation) {
      const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), this.#scene);
      ambient.intensity = 0.6;
      ambient.groundColor = new Color3(0.6, 0.6, 0.6);
      const key = new DirectionalLight('key', new Vector3(-20, -40, -30), this.#scene);
      key.intensity = 2.4;
      this.#createBackdrop();
    } else {
      const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.#scene);
      light.intensity = 1;
      light.groundColor = new Color3(0.4, 0.4, 0.4);
    }

    this.#instances = { sphere: this.#createInstanceMesh('sphere'), cube: this.#createInstanceMesh('cube') };
  }

  /** Matches the drawing buffer to the canvas's size. */
  resize(): void {
    this.#engine.resize();
  }

  /** Draws the objects at their states, the links between them, the camera, and the `3d` effect items; then renders. */
  render(
    scene: SceneType.Scene,
    states: readonly ObjectState[],
    camera: OrbitCamera,
    items: readonly Instance3D[],
  ): void {
    this.#updateObjects(scene, states);
    this.#updateLinks(scene, states);
    this.#updateInstances(items);
    // The target first: setting it recomputes the angles from the old position, which the pose then overwrites.
    this.#camera.target = new Vector3(camera.target.x, camera.target.y, camera.target.z);
    this.#camera.alpha = camera.alpha;
    this.#camera.beta = camera.beta;
    this.#camera.radius = camera.radius;
    this.#scene.render();
  }

  dispose(): void {
    this.#scene.dispose();
    this.#engine.dispose();
  }

  #createBackdrop(): void {
    const backdrop = CreateIcoSphere('backdrop', { radius: BACKDROP_RADIUS, subdivisions: 6 }, this.#scene);
    const material = createLatticeMaterial(this.#scene, 'backdrop');
    setLattice(material, Color3.FromHexString('#3b4a7a'), 0.35);
    backdrop.material = material;
    backdrop.isPickable = false;
  }

  #createInstanceMesh(primitive: Instance3D['primitive']): Mesh {
    const mesh =
      primitive === 'sphere'
        ? CreateSphere(`effect-${primitive}`, { diameter: 1, segments: 12 }, this.#scene)
        : CreateBox(`effect-${primitive}`, { size: 1 }, this.#scene);
    const material = new StandardMaterial(`effect-${primitive}`, this.#scene);
    // White, so each instance's colour shows as given; a little self-light so packets read against the dark.
    material.diffuseColor = Color3.White();
    material.emissiveColor = new Color3(0.45, 0.45, 0.45);
    material.specularColor = Color3.Black();
    mesh.material = material;
    mesh.hasVertexAlpha = true;
    mesh.isPickable = false;
    mesh.setEnabled(false);
    return mesh;
  }

  #createSurface(object: Model.Object): Mesh {
    const name = `object-${object.id}`;
    if (object.mesh?.vertexData && object.mesh.indexData) {
      const mesh = new Mesh(name, this.#scene);
      const data = new VertexData();
      data.positions = Model.decodeFloat32Array(object.mesh.vertexData);
      data.indices = Model.decodeUint32Array(object.mesh.indexData);
      const normals: number[] = [];
      VertexData.ComputeNormals(data.positions, data.indices, normals);
      data.normals = normals;
      data.applyToMesh(mesh);
      return mesh;
    }
    switch (object.primitive) {
      case 'sphere':
        return CreateSphere(name, { diameter: 1, segments: 48 }, this.#scene);
      case 'cylinder':
        return CreateCylinder(name, { diameter: 1, height: 1 }, this.#scene);
      case 'cone':
        return CreateCylinder(name, { diameterTop: 0, diameterBottom: 1, height: 1 }, this.#scene);
      case 'pyramid':
        return CreateCylinder(name, { diameterTop: 0, diameterBottom: 1, height: 1, tessellation: 4 }, this.#scene);
      default:
        return CreateBox(name, { size: 1 }, this.#scene);
    }
  }

  #createObject(object: Model.Object): ObjectMeshes {
    const surface = this.#createSurface(object);
    surface.isPickable = false;
    const material = createSurfaceMaterial(this.#scene, `surface-${object.id}`, this.#presentation);
    surface.material = material;
    const rest = object.opacity ?? 1;
    const meshes: ObjectMeshes = { surface, material, rest };
    // A see-through shell in the presentation look carries a rim and a lattice, parented so they move with it.
    if (this.#presentation && rest < 1) {
      const rim = surface.clone(`rim-${object.id}`, surface);
      rim.position = Vector3.Zero();
      rim.scaling = Vector3.One();
      const rimMaterial = createRimMaterial(this.#scene, `rim-${object.id}`);
      rim.material = rimMaterial;
      const lattice = CreateIcoSphere(`lattice-${object.id}`, { radius: 0.5, subdivisions: 3 }, this.#scene);
      lattice.parent = surface;
      lattice.isPickable = false;
      const latticeMaterial = createLatticeMaterial(this.#scene, `lattice-${object.id}`);
      lattice.material = latticeMaterial;
      meshes.rim = { mesh: rim, material: rimMaterial };
      meshes.lattice = { mesh: lattice, material: latticeMaterial };
    }
    return meshes;
  }

  #updateObjects(scene: SceneType.Scene, states: readonly ObjectState[]): void {
    const present = new Set(states.map((state) => state.id));
    for (const [id, meshes] of this.#objects) {
      if (!present.has(id)) {
        meshes.surface.dispose(false, true);
        this.#objects.delete(id);
      }
    }
    const byId = new Map(scene.objects.flatMap((ref) => (ref.target ? [[ref.target.id, ref.target] as const] : [])));
    for (const state of states) {
      const object = byId.get(state.id);
      if (!object) {
        continue;
      }
      let meshes = this.#objects.get(state.id);
      if (!meshes) {
        meshes = this.#createObject(object);
        this.#objects.set(state.id, meshes);
      }
      const { surface, material, rim, lattice, rest } = meshes;
      const visible = state.opacity > 0.001 && state.radius > 1e-4;
      surface.setEnabled(visible);
      if (!visible) {
        continue;
      }
      surface.position.set(state.position.x, state.position.y, state.position.z);
      surface.scaling.set(state.scale.x, state.scale.y, state.scale.z);
      surface.rotationQuaternion = Quaternion.FromEulerAngles(
        (state.rotation.x * Math.PI) / 180,
        (state.rotation.y * Math.PI) / 180,
        (state.rotation.z * Math.PI) / 180,
      );
      const color = Color3.FromHexString(state.color);
      setSurface(material, color, state.opacity);
      // A shell's rim and lattice fade with it, in proportion to its opacity at rest.
      const fade = rest > 0 ? Math.min(1, state.opacity / rest) : 1;
      if (rim) {
        setRim(rim.material, color, RIM_STRENGTH * fade);
      }
      if (lattice) {
        setLattice(lattice.material, color, LATTICE_OPACITY * fade);
      }
    }
  }

  #updateLinks(scene: SceneType.Scene, states: readonly ObjectState[]): void {
    const byId = new Map(states.map((state) => [state.id, state]));
    const present = new Set<string>();
    for (const link of scene.links ?? []) {
      const from = byId.get(link.from);
      const to = byId.get(link.to);
      if (!from || !to) {
        continue;
      }
      present.add(link.id);
      const points = [
        new Vector3(from.position.x, from.position.y, from.position.z),
        new Vector3(to.position.x, to.position.y, to.position.z),
      ];
      const existing = this.#links.get(link.id);
      const line = CreateLines(`link-${link.id}`, { points, updatable: true, instance: existing }, this.#scene);
      if (!existing) {
        line.color = Color3.FromHexString(this.#presentation ? '#8ea2e6' : '#666666');
        line.isPickable = false;
        this.#links.set(link.id, line);
      }
      line.alpha = (link.opacity ?? 0.35) * Math.min(from.opacity, to.opacity);
      line.setEnabled(line.alpha > 0.001);
    }
    for (const [id, line] of this.#links) {
      if (!present.has(id)) {
        line.dispose();
        this.#links.delete(id);
      }
    }
  }

  #updateInstances(items: readonly Instance3D[]): void {
    for (const primitive of ['sphere', 'cube'] as const) {
      const mesh = this.#instances[primitive];
      const chosen = items.filter((item) => item.primitive === primitive && item.opacity > 0);
      mesh.setEnabled(chosen.length > 0);
      if (chosen.length === 0) {
        continue;
      }
      const matrices = new Float32Array(chosen.length * 16);
      const colors = new Float32Array(chosen.length * 4);
      chosen.forEach((item, index) => {
        // Unit primitives are a unit across; an item's scale is its radius or half-width.
        const size = item.scale * 2;
        Matrix.Compose(
          new Vector3(size, size, size),
          Quaternion.Identity(),
          new Vector3(item.position.x, item.position.y, item.position.z),
        ).copyToArray(matrices, index * 16);
        const color = Color3.FromHexString(item.color);
        colors.set([color.r, color.g, color.b, item.opacity], index * 4);
      });
      mesh.thinInstanceSetBuffer('matrix', matrices, 16, false);
      mesh.thinInstanceSetBuffer('color', colors, 4, false);
    }
  }
}

/** The effect items a stage of renderers `3d` draws from a frame's effects. */
export const instanceItems = (effects: readonly AnimatorCapabilities.EffectFrame[]): Instance3D[] =>
  effects.flatMap((frame) => (frame.renderer === '3d' ? frame.items : []));
