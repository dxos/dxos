//
// Copyright 2026 DXOS.org
//

//
// The Babylon side of the 3D renderer: one engine with no render loop, drawn once per call, so the frame on screen is
// the frame for the values given and an exporter can capture it after `render` returns.
//

import {
  type AbstractEngine,
  type AbstractMesh,
  ArcRotateCamera,
  Camera,
  Color3,
  Color4,
  CreateBox,
  CreateCylinder,
  CreateIcoSphere,
  CreateLines,
  CreateLineSystem,
  CreatePlane,
  CreateSphere,
  DirectionalLight,
  Engine,
  GizmoManager,
  HemisphericLight,
  HighlightLayer,
  type LinesMesh,
  type Material,
  Matrix,
  Mesh,
  Quaternion,
  Scene,
  type ShaderMaterial,
  StandardMaterial,
  UtilityLayerRenderer,
  Vector3,
  VertexData,
} from '@babylonjs/core';

import { type Instance3D } from '@dxos/animation';
import { type Scene as Model } from '@dxos/scene';

import { groundPoint, orthoHalfHeight, toOrbit } from './camera.ts';
import { GRID_MAJOR_EVERY, groundGrid } from './grid.ts';
import { meshData } from './io/mesh.ts';
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

/** The outline of a selected item: the theme's focus blue. */
/** The selection colour when the host gives none. */
const DEFAULT_SELECTION = '#3b82f6';

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
  theme: Theme3D;
  /** The CAD background, read from the surface the view sits on. */
  background: string;
  /** The selection colour (the theme's focus colour, as the 2D canvas's selection frame); a blue when unset. */
  selection?: string;
} & (
  | { canvas: HTMLCanvasElement; engine?: undefined }
  /** An engine of the caller's, e.g. a `NullEngine` in a test. */
  | { engine: AbstractEngine; canvas?: undefined }
);

/** What a pick under the pointer found: an item's render-list key, and where the ray met it or the ground. */
export type PickResult = { item?: string; point?: Model.Vec3; normal?: Model.Vec3 };

/** The render-list key a surface carries, and whether it is a composite's frame. */
const pickTag = (mesh: AbstractMesh): { key: string; frame: boolean } | undefined => {
  const metadata: unknown = mesh.metadata;
  if (typeof metadata !== 'object' || metadata === null || !('key' in metadata) || typeof metadata.key !== 'string') {
    return undefined;
  }
  return { key: metadata.key, frame: 'frame' in metadata && metadata.frame === true };
};

const vec3 = ({ x, y, z }: Vector3): Model.Vec3 => ({ x, y, z });

export type GizmoMode = 'move' | 'rotate' | 'scale';

/** An item's transform in world space (rotation in Euler degrees), as a gizmo drag leaves it. */
export type WorldTransform = { center: Model.Vec3; rotation: Model.Vec3; scale: Model.Vec3 };

const degrees = (radians: number) => Math.round(((radians * 180) / Math.PI) * 1000) / 1000 + 0;

const worldTransform = (mesh: AbstractMesh): WorldTransform => {
  const rotation = mesh.rotationQuaternion?.toEulerAngles() ?? mesh.rotation;
  return {
    center: vec3(mesh.position),
    rotation: { x: degrees(rotation.x), y: degrees(rotation.y), z: degrees(rotation.z) },
    scale: vec3(mesh.scaling),
  };
};

const radians = (degrees: number) => (degrees * Math.PI) / 180;

const geometryIds = new WeakMap<MeshData, number>();
let nextGeometryId = 1;

/** What an item's meshes are built from; a change rebuilds them. Geometry counts by identity, not size. */
export const itemSignature = (kind: string, spec: MaterialSpec, data: MeshData | undefined): string => {
  let geometry = 0;
  if (data) {
    geometry = geometryIds.get(data) ?? nextGeometryId++;
    geometryIds.set(data, geometry);
  }
  return `${kind}:${spec.kind}:${spec.edges}:${geometry}`;
};

/** The most frames drawn while waiting for shaders, so a shader that never compiles cannot keep the view drawing. */
const SETTLE_FRAMES = 120;

/** Frames drawn after a selection changes, so the outline's effect compiles and shows. */
const OUTLINE_FRAMES = 3;

/** What the gizmos snap to with snapping on: the ground grid's minor unit, 15 degrees and a tenth of the size. */
export const SNAP = { move: 1, rotate: 15, scale: 0.1 } as const;

/** The ground grid's half-width, in scene units. */
const GRID_EXTENT = 20;

/** Draws a render list; never reads a clock and never writes ECHO. */
export class SceneRenderer3D {
  readonly #engine: AbstractEngine;
  #view?: Model.Camera3D;
  #gizmos?: GizmoManager;
  #gizmoEnd?: (after: WorldTransform) => void;
  // Babylon's default utility layer is one per process, on whichever scene was made last; a renderer keeps its own.
  #layers?: { normal: UtilityLayerRenderer; depth: UtilityLayerRenderer };
  #dragged = false;
  readonly #observed = new WeakSet<object>();
  #looping = false;
  #settling = false;
  #snap = false;
  #selected = new Set<string>();
  readonly #scene: Scene;
  readonly #camera: ArcRotateCamera;
  readonly #theme: Theme3D;
  readonly #items = new Map<string, ItemMeshes>();
  readonly #links = new Map<string, LinesMesh>();
  readonly #instances: Record<Instance3D['primitive'], Mesh>;
  #grid?: LinesMesh;
  readonly #highlight: HighlightLayer;
  #selection: string;
  readonly #boxes = new Map<string, { mesh: LinesMesh; min: Vector3; max: Vector3 }>();
  /** The selected face: the item's key and the face's axis-aligned outward normal, drawn as a pane over that side. */
  #faceSelection?: { key: string; normal: Model.Vec3 };
  #faceMesh?: { mesh: Mesh; center: Vector3 };

  constructor({ canvas, engine, theme, background, selection = DEFAULT_SELECTION }: SceneRenderer3DOptions) {
    this.#theme = theme;
    this.#selection = selection;
    const presentation = theme === 'presentation';
    this.#engine =
      engine ?? new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, adaptToDeviceRatio: true });
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
    // A screen-space stroke round the silhouette: an outline pushed out along vertex normals splits at a box's corners,
    // whose faces have normals of their own.
    this.#highlight = new HighlightLayer('selection', this.#scene, {
      isStroke: true,
      blurHorizontalSize: 0.5,
      blurVerticalSize: 0.5,
    });
    this.#highlight.innerGlow = false;
  }

  /** The selection colour, as a hex string. */
  get highlightColor(): string {
    return this.#selection;
  }

  /** Each selected item's world-aligned bounding box: its corners and colour, by key. */
  get boxes(): Record<string, { min: Vector3; max: Vector3; color: string }> {
    return Object.fromEntries(
      [...this.#boxes].map(([key, { min, max }]) => [key, { min, max, color: this.#selection }]),
    );
  }

  /** Turns gizmo snapping on (to the grid unit, 15 degrees and a tenth) or off. */
  setSnap(snap: boolean): void {
    this.#snap = snap;
    this.#applySnap();
  }

  /** The steps the gizmos snap to: a move in scene units, a turn in degrees, a scale factor; zero when free. */
  get gizmoSnap(): { move: number; rotate: number; scale: number } {
    return this.#snap ? { move: SNAP.move, rotate: SNAP.rotate, scale: SNAP.scale } : { move: 0, rotate: 0, scale: 0 };
  }

  /** The selected face as drawn: the item, its normal, the pane's centre and colour. */
  get face(): { key: string; normal: Model.Vec3; center: Vector3; color: string } | undefined {
    return this.#faceSelection && this.#faceMesh
      ? { ...this.#faceSelection, center: this.#faceMesh.center, color: this.#selection }
      : undefined;
  }

  /** Marks the face of item `key` that `normal` (an axis) points out of; none when `key` is undefined. */
  selectFace(key: string | undefined, normal?: Model.Vec3): void {
    this.#faceSelection = key === undefined || !normal ? undefined : { key, normal };
    this.#drawFace();
    this.#view && this.#scene.render();
  }

  /** Changes the selection colour, e.g. when the theme does. */
  setSelectionColor(color: string): void {
    if (color === this.#selection) {
      return;
    }
    this.#selection = color;
    this.#highlight.removeAllMeshes();
    this.#clearBoxes();
    this.#outline();
    this.#view && this.#scene.render();
  }

  /** The keys of the items outlined as selected. */
  get highlighted(): string[] {
    return [...this.#items].flatMap(([key, { surface }]) => (this.#highlight.hasMesh(surface) ? [key] : []));
  }

  /** Whether the ground grid is drawn. */
  get grid(): boolean {
    return this.#grid?.isEnabled() ?? false;
  }

  /** Shows or hides the ground grid: unit lines on the y = 0 plane, made the first time it shows. */
  setGrid(visible: boolean): void {
    if (visible === this.grid) {
      return;
    }
    if (visible && !this.#grid) {
      this.#grid = this.#createGrid();
    }
    this.#grid?.setEnabled(visible);
    this.#view && this.#scene.render();
  }

  /** Matches the drawing buffer to the canvas's size. */
  resize(): void {
    this.#engine.resize();
    // Resizing clears the drawing buffer, so a still view draws its last frame again rather than stay blank.
    this.#view && this.#scene.render();
  }

  /** Draws the items and links, poses the camera, adds the `3d` effect items, then renders one frame. */
  render(
    list: RenderList,
    camera: Model.Camera3D,
    { geometry, effects = [] }: { geometry?: GeometrySource; effects?: readonly Instance3D[] } = {},
  ): void {
    this.#updateItems(list.items, geometry);
    this.#outline();
    this.#drawFace();
    this.#updateLinks(list);
    this.#updateInstances(effects);
    this.#pose(camera);
    this.#view = camera;
    this.#scene.render();
    // Materials compile asynchronously: draw again once the scene's are ready, and until the outline's are.
    this.#scene.executeWhenReady(() => this.#scene.render());
    this.#settle();
  }

  /**
   * The item under a pixel (CSS pixels from the canvas's top left) and where the ray met it, else where it meets the
   * ground. `through` looks past composites' frames to the parts inside them, as an editor drilled into one does.
   */
  pick(screen: { x: number; y: number }, { through = false }: { through?: boolean } = {}): PickResult {
    const hit = this.#scene.pick(screen.x, screen.y, (mesh) => {
      const tag = pickTag(mesh);
      return tag !== undefined && mesh.isEnabled() && !(through && tag.frame);
    });
    const tag = hit?.hit && hit.pickedMesh ? pickTag(hit.pickedMesh) : undefined;
    if (tag && hit?.pickedPoint) {
      const normal = hit.getNormal(true, true);
      return { item: tag.key, point: vec3(hit.pickedPoint), ...(normal ? { normal: vec3(normal) } : {}) };
    }
    const scaling = this.#engine.getHardwareScalingLevel();
    const viewport = {
      width: this.#engine.getRenderWidth() * scaling,
      height: this.#engine.getRenderHeight() * scaling,
    };
    const point = this.#view && groundPoint(this.#view, viewport, screen);
    return point ? { point } : {};
  }

  /** Outlines the items whose keys are given. */
  select(keys: Iterable<string>): void {
    this.#selected = new Set(keys);
    this.#outline();
    if (this.#view) {
      this.#scene.render();
      this.#settle(OUTLINE_FRAMES);
    }
  }

  /**
   * Puts Babylon's gizmo of `mode` on the item `key` (none when either is undefined), drawing every frame while it is
   * on so a drag shows; `onEnd` gets the item's world transform when a drag ends.
   */
  attachGizmo(key: string | undefined, mode: GizmoMode | undefined, onEnd: (after: WorldTransform) => void): void {
    const mesh = key === undefined ? undefined : this.#items.get(key)?.surface;
    if (!mesh || !mode) {
      this.#gizmos?.attachToMesh(null);
      this.#gizmoEnd = undefined;
      // Stopping the loop stops every function it runs, a settling one too.
      this.#looping && this.#engine.stopRenderLoop();
      this.#looping = false;
      this.#settling = false;
      return;
    }
    this.#layers ??= {
      normal: new UtilityLayerRenderer(this.#scene),
      depth: new UtilityLayerRenderer(this.#scene),
    };
    this.#layers.depth.utilityLayerScene.autoClearDepthAndStencil = false;
    const gizmos = this.#gizmos ?? new GizmoManager(this.#scene, undefined, this.#layers.normal, this.#layers.depth);
    this.#gizmos = gizmos;
    gizmos.usePointerToAttachGizmos = false;
    gizmos.positionGizmoEnabled = mode === 'move';
    gizmos.rotationGizmoEnabled = mode === 'rotate';
    gizmos.scaleGizmoEnabled = mode === 'scale';
    gizmos.attachToMesh(mesh);
    this.#applySnap();
    this.#gizmoEnd = onEnd;
    for (const gizmo of [gizmos.gizmos.positionGizmo, gizmos.gizmos.rotationGizmo, gizmos.gizmos.scaleGizmo]) {
      if (gizmo && !this.#observed.has(gizmo)) {
        this.#observed.add(gizmo);
        gizmo.onDragStartObservable.add(() => {
          this.#dragged = true;
        });
        gizmo.onDragEndObservable.add(() => {
          const attached = gizmo.attachedMesh;
          attached && this.#gizmoEnd?.(worldTransform(attached));
        });
      }
    }
    if (!this.#looping) {
      this.#looping = true;
      this.#engine.runRenderLoop(() => this.#scene.render());
    }
  }

  /** Whether a gizmo is being dragged, so the pointer's release is the drag's rather than a click. */
  get dragging(): boolean {
    return this.#gizmos?.isDragging ?? false;
  }

  /**
   * Whether a gizmo was dragged since the last call: Babylon ends the drag before the pointer's release reaches the host,
   * so `dragging` alone would read a short drag as a click.
   */
  takeDrag(): boolean {
    const dragged = this.#dragged;
    this.#dragged = false;
    return dragged;
  }

  /** The layer this renderer's gizmos draw on. */
  get gizmoLayer(): UtilityLayerRenderer | undefined {
    return this.#layers?.normal;
  }

  dispose(): void {
    this.#clearBoxes();
    this.#faceSelection = undefined;
    this.#drawFace();
    this.#highlight.dispose();
    this.#gizmos?.dispose();
    this.#layers?.normal.dispose();
    this.#layers?.depth.dispose();
    this.#looping && this.#engine.stopRenderLoop();
    this.#scene.dispose();
    this.#engine.dispose();
  }

  #applySnap(): void {
    const { move, rotate, scale } = this.gizmoSnap;
    const gizmos = this.#gizmos?.gizmos;
    gizmos?.positionGizmo && (gizmos.positionGizmo.snapDistance = move);
    gizmos?.rotationGizmo && (gizmos.rotationGizmo.snapDistance = (rotate * Math.PI) / 180);
    gizmos?.scaleGizmo && (gizmos.scaleGizmo.snapDistance = scale);
  }

  /** Whether the scene's materials and the selection outline's layer have compiled. */
  #ready(): boolean {
    return this.#scene.isReady() && this.#highlight.isLayerReady();
  }

  /**
   * Shaders compile asynchronously, so a still view's only frame can draw before its materials or outline are ready:
   * draws frames until they are (at least `minFrames`, as an outline's per-mesh effect compiles on the frame that first
   * draws it), then stops; a running gizmo loop draws them anyway.
   */
  #settle(minFrames = 0): void {
    if (this.#settling || this.#looping || (minFrames === 0 && this.#ready())) {
      return;
    }
    this.#settling = true;
    let frames = 0;
    const step = () => {
      this.#scene.render();
      frames++;
      if ((frames >= minFrames && this.#ready()) || frames > SETTLE_FRAMES) {
        this.#engine.stopRenderLoop(step);
        this.#settling = false;
      }
    };
    this.#engine.runRenderLoop(step);
  }

  #outline(): void {
    const color = Color3.FromHexString(this.#selection);
    for (const [key, { surface }] of this.#items) {
      const selected = this.#selected.has(key);
      if (selected && !this.#highlight.hasMesh(surface)) {
        this.#highlight.addMesh(surface, color);
      } else if (!selected && this.#highlight.hasMesh(surface)) {
        this.#highlight.removeMesh(surface);
      }
    }
    // The boxes follow the items' current bounds, so a moved or resized item's box is drawn afresh.
    this.#clearBoxes();
    for (const [key, { surface }] of this.#items) {
      if (this.#selected.has(key)) {
        this.#boxes.set(key, this.#createBox(key, surface, color));
      }
    }
  }

  /** A thin wire box round an item's world-aligned bounds, drawn apart from the outline (which only meshes take). */
  #createBox(key: string, surface: AbstractMesh, color: Color3): { mesh: LinesMesh; min: Vector3; max: Vector3 } {
    surface.computeWorldMatrix(true);
    const { minimumWorld: min, maximumWorld: max } = surface.getBoundingInfo().boundingBox;
    const corner = (x: number, y: number, z: number) =>
      new Vector3(x ? max.x : min.x, y ? max.y : min.y, z ? max.z : min.z);
    const edges: [number, number, number, number, number, number][] = [
      [0, 0, 0, 1, 0, 0],
      [0, 1, 0, 1, 1, 0],
      [0, 0, 1, 1, 0, 1],
      [0, 1, 1, 1, 1, 1],
      [0, 0, 0, 0, 1, 0],
      [1, 0, 0, 1, 1, 0],
      [0, 0, 1, 0, 1, 1],
      [1, 0, 1, 1, 1, 1],
      [0, 0, 0, 0, 0, 1],
      [1, 0, 0, 1, 0, 1],
      [0, 1, 0, 0, 1, 1],
      [1, 1, 0, 1, 1, 1],
    ];
    const mesh = CreateLineSystem(
      `box-${key}`,
      { lines: edges.map(([x0, y0, z0, x1, y1, z1]) => [corner(x0, y0, z0), corner(x1, y1, z1)]) },
      this.#scene,
    );
    mesh.color = color;
    mesh.alpha = 0.8;
    mesh.isPickable = false;
    return { mesh, min: min.clone(), max: max.clone() };
  }

  /** A translucent pane over the selected face of its item's world-aligned bounds, a little proud of it. */
  #drawFace(): void {
    this.#faceMesh?.mesh.dispose();
    this.#faceMesh = undefined;
    const selection = this.#faceSelection;
    const surface = selection ? this.#items.get(selection.key)?.surface : undefined;
    if (!selection || !surface) {
      return;
    }
    surface.computeWorldMatrix(true);
    const { minimumWorld: min, maximumWorld: max } = surface.getBoundingInfo().boundingBox;
    const { x: nx, y: ny, z: nz } = selection.normal;
    const size = max.subtract(min);
    const middle = min.add(max).scale(0.5);
    const lift = 0.002;
    const center = new Vector3(
      nx === 0 ? middle.x : (nx > 0 ? max.x : min.x) + nx * lift,
      ny === 0 ? middle.y : (ny > 0 ? max.y : min.y) + ny * lift,
      nz === 0 ? middle.z : (nz > 0 ? max.z : min.z) + nz * lift,
    );
    // A plane lies in x/y facing -z; its width and height are the face's two other extents.
    const [width, height] = nx !== 0 ? [size.z, size.y] : ny !== 0 ? [size.x, size.z] : [size.x, size.y];
    const mesh = CreatePlane(`face-${selection.key}`, { width, height, sideOrientation: Mesh.DOUBLESIDE }, this.#scene);
    mesh.position = center;
    mesh.rotation =
      nx !== 0 ? new Vector3(0, Math.PI / 2, 0) : ny !== 0 ? new Vector3(Math.PI / 2, 0, 0) : Vector3.Zero();
    const material = new StandardMaterial(`face-${selection.key}`, this.#scene);
    material.emissiveColor = Color3.FromHexString(this.#selection);
    material.disableLighting = true;
    material.alpha = 0.35;
    mesh.material = material;
    mesh.isPickable = false;
    this.#faceMesh = { mesh, center: center.clone() };
  }

  #clearBoxes(): void {
    this.#boxes.forEach(({ mesh }) => mesh.dispose());
    this.#boxes.clear();
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

  #createGrid(): LinesMesh {
    const { lines } = groundGrid({ extent: GRID_EXTENT, majorEvery: GRID_MAJOR_EVERY });
    const tint = Color3.FromHexString(this.#theme === 'presentation' ? '#8da2e0' : '#9aa1ad');
    const grid = CreateLineSystem(
      'grid',
      {
        lines: lines.map(({ axis, offset }) =>
          axis === 'x'
            ? [new Vector3(offset, 0, -GRID_EXTENT), new Vector3(offset, 0, GRID_EXTENT)]
            : [new Vector3(-GRID_EXTENT, 0, offset), new Vector3(GRID_EXTENT, 0, offset)],
        ),
        colors: lines.map(({ alpha }) => [tint.toColor4(alpha), tint.toColor4(alpha)]),
        useVertexAlpha: true,
      },
      this.#scene,
    );
    // A guide, not content: clicks land on what is above it, or on the ground point beneath.
    grid.isPickable = false;
    return grid;
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
    switch (item.type) {
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
    // Picking finds an item by the key its surface carries; a composite's frame says so, to be looked through.
    surface.metadata = { key: item.key, frame: item.frame === true };
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
      rim.metadata = undefined;
      rim.isPickable = false;
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
      // An imported mesh carries its own triangles; Manifold supplies solids' and rounded cubes'.
      const data = geometry?.(item) ?? meshData(item);
      const signature = itemSignature(item.type, spec, data);
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
      surface.position.set(item.center.x, item.center.y, item.center.z);
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
