//
// Copyright 2026 DXOS.org
//

//
// The Babylon side of the 3D renderer: one engine with no render loop, drawn once per call, so the frame on screen is
// the frame for the values given and an exporter can capture it after `render` returns.
//

import {
  ArcRotateCamera,
  Camera,
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
import { type Scene as Model } from '@dxos/scene';

import { orthoHalfHeight, toOrbit } from './camera.ts';
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
import { type RenderItem, type RenderList } from './render-list.ts';
import { type MaterialSpec, type Theme3D, materialSpec } from './style.ts';

/** The radius of the faint lattice sphere the presentation theme draws behind everything. */
const BACKDROP_RADIUS = 4000;

/** Triangle geometry for an item Babylon has no builder for (a solid), in the item's local units. */
export type MeshData = { positions: Float32Array; indices: Uint32Array };

/**
 * Supplies the geometry of items drawn from data rather than a builder, in units the item's scale multiplies: a solid's
 * in its scene's coordinates (its scale is the frame's), a rounded cube at unit size.
 */
export type GeometrySource = (item: RenderItem) => MeshData | undefined;

type ItemMeshes = {
  /** What the meshes were built for; a change of kind, look or geometry rebuilds them. */
  signature: string;
  surface: Mesh;
  material: Material;
  rim?: { mesh: Mesh; material: ShaderMaterial };
  lattice?: { mesh: Mesh; material: StandardMaterial };
};

export type SceneRenderer3DOptions = {
  canvas: HTMLCanvasElement;
  theme: Theme3D;
  /** The CAD background, read from the surface the view sits on. */
  background: string;
};

const radians = (degrees: number) => (degrees * Math.PI) / 180;

/** Draws a render list; never reads a clock and never writes ECHO. */
export class SceneRenderer3D {
  readonly #engine: Engine;
  readonly #scene: Scene;
  readonly #camera: ArcRotateCamera;
  readonly #theme: Theme3D;
  readonly #items = new Map<string, ItemMeshes>();
  readonly #links = new Map<string, LinesMesh>();
  readonly #instances: Record<Instance3D['primitive'], Mesh>;

  constructor({ canvas, theme, background }: SceneRenderer3DOptions) {
    this.#theme = theme;
    const presentation = theme === 'presentation';
    this.#engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, adaptToDeviceRatio: true });
    this.#scene = new Scene(this.#engine);
    this.#scene.clearColor = Color4.FromHexString(`${presentation ? PRESENTATION_BACKGROUND : background}ff`);
    // Dithering keeps the smooth shading of large spheres from banding in 8-bit colour.
    this.#scene.imageProcessingConfiguration.ditheringEnabled = true;

    this.#camera = new ArcRotateCamera('camera', 0, Math.PI / 3, 10, Vector3.Zero(), this.#scene);
    this.#camera.minZ = 0.05;
    this.#camera.maxZ = BACKDROP_RADIUS * 4;
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
      const light = new HemisphericLight('light', new Vector3(0.3, 1, -0.4), this.#scene);
      light.intensity = 1;
      light.groundColor = new Color3(0.35, 0.35, 0.4);
    }

    this.#instances = { sphere: this.#createInstanceMesh('sphere'), cube: this.#createInstanceMesh('cube') };
  }

  /** Matches the drawing buffer to the canvas's size. */
  resize(): void {
    this.#engine.resize();
  }

  /** Draws the items and links, poses the camera, adds the `3d` effect items, then renders one frame. */
  render(
    list: RenderList,
    camera: Model.Camera3D,
    { geometry, effects = [] }: { geometry?: GeometrySource; effects?: readonly Instance3D[] } = {},
  ): void {
    this.#updateItems(list.items, geometry);
    this.#updateLinks(list);
    this.#updateInstances(effects);
    this.#pose(camera);
    this.#scene.render();
    // Shaders compile asynchronously, so a still view's only frame can draw before its materials are ready.
    if (!this.#scene.isReady()) {
      this.#scene.executeWhenReady(() => this.#scene.render());
    }
  }

  dispose(): void {
    this.#scene.dispose();
    this.#engine.dispose();
  }

  #pose(camera: Model.Camera3D): void {
    const orbit = toOrbit(camera);
    // The target first: setting it recomputes the angles from the old position, which the pose then overwrites.
    this.#camera.target = new Vector3(orbit.target.x, orbit.target.y, orbit.target.z);
    this.#camera.alpha = orbit.alpha;
    this.#camera.beta = orbit.beta;
    this.#camera.radius = orbit.radius;
    this.#camera.fov = camera.fov;
    if (camera.projection === 'orthographic') {
      const half = orthoHalfHeight(camera);
      const aspect = this.#engine.getAspectRatio(this.#camera);
      this.#camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
      this.#camera.orthoTop = half;
      this.#camera.orthoBottom = -half;
      this.#camera.orthoLeft = -half * aspect;
      this.#camera.orthoRight = half * aspect;
    } else {
      this.#camera.mode = Camera.PERSPECTIVE_CAMERA;
    }
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

  /** A unit-sized surface for the item's kind (scale then sizes it), or its supplied triangles. */
  #createSurface(item: RenderItem, data: MeshData | undefined): Mesh {
    const name = `item-${item.key}`;
    if (data) {
      const mesh = new Mesh(name, this.#scene);
      const vertices = new VertexData();
      vertices.positions = data.positions;
      vertices.indices = data.indices;
      const normals: number[] = [];
      VertexData.ComputeNormals(data.positions, data.indices, normals);
      vertices.normals = normals;
      vertices.applyToMesh(mesh);
      return mesh;
    }
    switch (item.kind) {
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

  #createItem(item: RenderItem, spec: MaterialSpec, data: MeshData | undefined, signature: string): ItemMeshes {
    const surface = this.#createSurface(item, data);
    surface.isPickable = false;
    const material = createSurfaceMaterial(this.#scene, `surface-${item.key}`, spec.kind !== 'standard');
    surface.material = material;
    if (spec.edges) {
      surface.enableEdgesRendering();
      surface.edgesWidth = 2;
      // Darker than the surface, so the edges read against it.
      const edge = Color3.FromHexString(spec.color).scale(0.45);
      surface.edgesColor = new Color4(edge.r, edge.g, edge.b, 1);
    }
    const meshes: ItemMeshes = { signature, surface, material };
    // A see-through shell in the presentation theme carries a rim and a lattice, parented so they move with it.
    if (spec.kind === 'rim') {
      const rim = surface.clone(`rim-${item.key}`, surface);
      rim.position = Vector3.Zero();
      rim.scaling = Vector3.One();
      rim.disableEdgesRendering();
      const rimMaterial = createRimMaterial(this.#scene, `rim-${item.key}`);
      rim.material = rimMaterial;
      const lattice = CreateIcoSphere(`lattice-${item.key}`, { radius: 0.5, subdivisions: 3 }, this.#scene);
      lattice.parent = surface;
      lattice.isPickable = false;
      const latticeMaterial = createLatticeMaterial(this.#scene, `lattice-${item.key}`);
      lattice.material = latticeMaterial;
      meshes.rim = { mesh: rim, material: rimMaterial };
      meshes.lattice = { mesh: lattice, material: latticeMaterial };
    }
    return meshes;
  }

  #updateItems(items: readonly RenderItem[], geometry: GeometrySource | undefined): void {
    const present = new Set(items.map((item) => item.key));
    for (const [key, meshes] of this.#items) {
      if (!present.has(key)) {
        meshes.surface.dispose(false, true);
        this.#items.delete(key);
      }
    }
    for (const item of items) {
      const spec = materialSpec(item.style, this.#theme);
      const data = geometry?.(item);
      const signature = `${item.kind}:${spec.kind}:${spec.edges}:${data ? data.positions.length : 0}`;
      let meshes = this.#items.get(item.key);
      if (meshes?.signature !== signature) {
        meshes?.surface.dispose(false, true);
        meshes = this.#createItem(item, spec, data, signature);
        this.#items.set(item.key, meshes);
      }
      const { surface, material, rim, lattice } = meshes;
      const visible = spec.alpha > 0.001;
      surface.setEnabled(visible);
      if (!visible) {
        continue;
      }
      surface.position.set(item.position.x, item.position.y, item.position.z);
      surface.scaling.set(item.scale.x, item.scale.y, item.scale.z);
      surface.rotationQuaternion = Quaternion.FromEulerAngles(
        radians(item.rotation.x),
        radians(item.rotation.y),
        radians(item.rotation.z),
      );
      const color = Color3.FromHexString(spec.color);
      // A rim shell's surface is nearly clear; the rim and lattice carry its colour.
      setSurface(material, color, spec.kind === 'rim' ? spec.alpha * 0.25 : spec.alpha);
      rim && setRim(rim.material, color, RIM_STRENGTH * Math.min(1, spec.alpha / 0.4));
      lattice && setLattice(lattice.material, color, LATTICE_OPACITY * Math.min(1, spec.alpha / 0.4));
    }
  }

  #updateLinks(list: RenderList): void {
    const present = new Set<string>();
    for (const link of list.links) {
      present.add(link.key);
      const points = [new Vector3(link.from.x, link.from.y, link.from.z), new Vector3(link.to.x, link.to.y, link.to.z)];
      const existing = this.#links.get(link.key);
      const line = CreateLines(`link-${link.key}`, { points, updatable: true, instance: existing }, this.#scene);
      if (!existing) {
        line.color = Color3.FromHexString(this.#theme === 'presentation' ? '#8ea2e6' : '#555b66');
        line.isPickable = false;
        this.#links.set(link.key, line);
      }
      line.alpha = link.style?.opacity ?? 0.6;
    }
    for (const [key, line] of this.#links) {
      if (!present.has(key)) {
        line.dispose();
        this.#links.delete(key);
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
