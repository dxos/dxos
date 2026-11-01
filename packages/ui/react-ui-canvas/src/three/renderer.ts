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
  Constants,
  CreateBox,
  CreateCylinder,
  CreateGround,
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
  ShadowGenerator,
  StandardMaterial,
  UtilityLayerRenderer,
  Vector3,
  VertexData,
} from '@babylonjs/core';

import { type Instance3D } from '@dxos/animation';
import { type Scene as Model } from '@dxos/scene';

import { NEU_PALETTE, type NeuPalette, type ThemeMode } from '../model/index.ts';
import { DETENT_PX, magnetTo, snapTo } from '../utils/index.ts';
import { groundPoint, orthoHalfHeight, toOrbit } from './camera.ts';
import { GRID_MAJOR_EVERY, GRID_MINOR, groundAxes, groundGrid } from './grid.ts';
import { meshData } from './io/index.ts';
import {
  LATTICE_OPACITY,
  PRESENTATION_BACKGROUND,
  RIM_STRENGTH,
  createLatticeMaterial,
  createRimMaterial,
  createSurfaceMaterial,
  setLattice,
  setNeuAccent,
  setRim,
  setSurface,
} from './materials.ts';
import { creasedNormals } from './normals.ts';
import { type RenderItem, type RenderList } from './render-list.ts';
import { type MaterialSpec, type Theme3D, isNeuTheme, materialSpec, themeMode3D } from './style.ts';

/** The outline of a selected item: the theme's focus blue. */
/** The selection colour when the host gives none. */
const DEFAULT_SELECTION = '#3b82f6';

/** Whether a Neu item casts a contact shadow: a solid body, not a see-through shell or a composite's frame. */
export const castsNeuShadow = (spec: MaterialSpec, item: Pick<RenderItem, 'frame'>): boolean =>
  spec.kind === 'neu' && spec.alpha >= 0.999 && item.frame !== true;

/** How often, and for how long, a disposed renderer waits for Babylon to finish decoding its PBR lookup texture. */
const DECODE_POLL = 16;
const DECODE_WAIT = 2_000;

/** The half-width of a Neu theme's ground plane: past the camera's reach, so its edge never shows. */
const NEU_GROUND_EXTENT = 1000;

/** How far a Neu contact shadow darkens the ground (0 black, 1 none), per mode: dark grounds have less room to darken. */
const NEU_SHADOW_DARKNESS: Record<ThemeMode, number> = { light: 0.72, dark: 0.55 };

/** Neu's sky and key light per mode: a dark ground is lit harder, so a body's top still rises above it. */
const NEU_LIGHTS: Record<ThemeMode, { sky: number; key: number }> = {
  light: { sky: 0.72, key: 0.3 },
  dark: { sky: 1.15, key: 0.6 },
};

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
  /** The app's light or dark mode, for a look that follows it; light when unset. */
  mode?: ThemeMode;
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

/** Whether the mesh's world-aligned bounds are still `min` to `max`. */
const sameBounds = (surface: AbstractMesh, { min, max }: { min: Vector3; max: Vector3 }): boolean => {
  surface.computeWorldMatrix(true);
  const { minimumWorld, maximumWorld } = surface.getBoundingInfo().boundingBox;
  return minimumWorld.equalsWithEpsilon(min) && maximumWorld.equalsWithEpsilon(max);
};

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

/** A mesh's orientation as a quaternion, whichever of the two Babylon holds it in. */
const turnOf = (mesh: AbstractMesh): Quaternion =>
  mesh.rotationQuaternion?.clone() ?? Quaternion.FromEulerVector(mesh.rotation);

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

/** The rendering group selection boxes draw in, after the scene with its depth cleared. */
const OVERLAY_GROUP = 1;

/** What the gizmos snap to with snapping on: the ground grid's minor spacing, 15 degrees and a tenth of the size. */
export const SNAP = { move: GRID_MINOR, rotate: 15, scale: 0.1 } as const;

/** The ground grid's half-width, in scene units. */
const GRID_EXTENT = 20;

/** Draws a render list; never reads a clock and never writes ECHO. */
export class SceneRenderer3D {
  readonly #engine: AbstractEngine;
  #view?: Model.Camera3D;
  #gizmos?: GizmoManager;
  #gizmoEnd?: (after: WorldTransform, group: Record<string, WorldTransform>) => void;
  // The other selected items, which a gizmo drag carries along with the one it is on.
  #group: string[] = [];
  // Babylon's default utility layer is one per process, on whichever scene was made last; a renderer keeps its own.
  #layers?: { normal: UtilityLayerRenderer; depth: UtilityLayerRenderer };
  #dragged = false;
  // A gizmo drag under way: where the item started, where the pointer alone would have put it, and its box's low corner.
  #drag?: {
    position: Vector3;
    rotation: Vector3;
    turn: Quaternion;
    scaling: Vector3;
    free: Vector3;
    last: Vector3;
    corner: Vector3;
    group: { mesh: AbstractMesh; position: Vector3; turn: Quaternion; scaling: Vector3 }[];
  };
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
  #axes?: LinesMesh;
  readonly #highlight: HighlightLayer;
  /** The meshes kept out of the outline's mask and stencil: every mesh but the selected items'. */
  readonly #excluded = new Set<Mesh>();
  readonly #watched = new WeakSet<Mesh>();
  #selection: string;
  readonly #boxes = new Map<string, { mesh: LinesMesh; min: Vector3; max: Vector3 }>();
  /** The selected face: the item's key and the face's axis-aligned outward normal, drawn as a pane over that side. */
  #faceSelection?: { key: string; normal: Model.Vec3 };
  #faceMesh?: { mesh: Mesh; center: Vector3 };
  /** The face under the pointer, tinted faintly and outlined round that side of its item's bounds. */
  #faceHover?: { key: string; normal: Model.Vec3 };
  #faceHoverMesh?: { fill: Mesh; line: LinesMesh; outline: Vector3[] };
  /** A Neu theme's tones: the 2D Neu themes', so the two dimensions share a ground in each mode. */
  readonly #palette?: NeuPalette;
  /** A Neu theme's ground plane and the shadows the items cast on it. */
  readonly #ground?: { mesh: Mesh; shadows: ShadowGenerator };
  readonly #background: string;

  constructor({
    canvas,
    engine,
    theme,
    mode = 'light',
    background,
    selection = DEFAULT_SELECTION,
  }: SceneRenderer3DOptions) {
    this.#theme = theme;
    this.#selection = selection;
    const presentation = theme === 'presentation';
    const neuMode = themeMode3D(theme, mode);
    this.#palette = isNeuTheme(theme) ? NEU_PALETTE[neuMode] : undefined;
    this.#background = this.#palette?.ground ?? (presentation ? PRESENTATION_BACKGROUND : background);
    this.#engine =
      engine ?? new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, adaptToDeviceRatio: true });
    this.#scene = new Scene(this.#engine);
    this.#scene.clearColor = Color4.FromHexString(`${this.#background}ff`);
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
    } else if (this.#palette) {
      this.#ground = this.#createNeuGround(this.#palette, neuMode);
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
    // Another mesh in the outline's mask cuts the selected silhouette where it intersects or shares a face (which
    // z-fights there), striping the stroke; with every other mesh excluded the mask is the whole silhouette.
    // Swept before each frame, since meshes come and go with the items, links, boxes and grid.
    // (An instanced mesh draws with its source, so excluding the source covers it.)
    this.#scene.onBeforeRenderObservable.add(() =>
      this.#scene.meshes.forEach((mesh) => mesh instanceof Mesh && this.#exclude(mesh)),
    );
    // The stroke is drawn where the stencil is not the selection's, so a selected item marks its whole silhouette, even
    // where another item is in front of it; excluded meshes write no stencil at all.
    this.#scene.onBeforeCameraRenderObservable.add(() => this.#engine.setStencilOperationDepthFail(Constants.REPLACE));
    this.#scene.onAfterCameraRenderObservable.add(() => this.#engine.setStencilOperationDepthFail(Constants.KEEP));
    // Selection boxes draw over the scene, as 2D's frame does, so a face that an edge lies on cannot z-fight with it.
    this.#scene.setRenderingAutoClearDepthStencil(OVERLAY_GROUP, true, true, false);
  }

  /** The colour the view clears to, as `#rrggbb`. */
  get background(): string {
    return this.#background;
  }

  /** The height of the Neu ground: the grid's plane, or under the lowest item; none in other looks. */
  get groundLevel(): number | undefined {
    return this.#ground?.mesh.position.y;
  }

  /** The selection colour, as a hex string. */
  get highlightColor(): string {
    return this.#selection;
  }

  /** Each selected item's world-aligned bounding box: its corners, colour and whether it draws over the scene, by key. */
  get boxes(): Record<string, { min: Vector3; max: Vector3; color: string; onTop: boolean }> {
    return Object.fromEntries(
      [...this.#boxes].map(([key, { mesh, min, max }]) => [
        key,
        { min, max, color: mesh.color.toHexString().toLowerCase(), onTop: mesh.renderingGroupId === OVERLAY_GROUP },
      ]),
    );
  }

  /** The world size of the item `key` along the axis `direction` is nearest, from its world-aligned bounds. */
  extent(key: string, direction: Model.Vec3): number | undefined {
    const mesh = this.#items.get(key)?.surface;
    if (!mesh) {
      return undefined;
    }
    mesh.computeWorldMatrix(true);
    const { minimumWorld, maximumWorld } = mesh.getBoundingInfo().boundingBox;
    const size = maximumWorld.subtract(minimumWorld);
    const [x, y, z] = [Math.abs(direction.x), Math.abs(direction.y), Math.abs(direction.z)];
    return x >= y && x >= z ? size.x : y >= z ? size.y : size.z;
  }

  /** The meshes that would cut into the selection outline's mask: none, whatever overlaps the selection. */
  get outlineOccluders(): string[] {
    return this.#scene.meshes
      .filter((mesh) => mesh instanceof Mesh && !this.#excluded.has(mesh) && !this.#highlight.hasMesh(mesh))
      .map((mesh) => mesh.name);
  }

  /** Turns gizmo snapping on (to the minor grid, 15 degrees and a tenth) or off. */
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

  /** The hovered face as drawn: the item, its normal and the closed loop round it. */
  get hoveredFace(): { key: string; normal: Model.Vec3; outline: Vector3[] } | undefined {
    return this.#faceHover && this.#faceHoverMesh
      ? { ...this.#faceHover, outline: this.#faceHoverMesh.outline }
      : undefined;
  }

  /** Outlines the face of item `key` that `normal` (an axis) points out of; none when `key` is undefined. */
  hoverFace(key: string | undefined, normal?: Model.Vec3): void {
    const next = key === undefined || !normal ? undefined : { key, normal };
    const current = this.#faceHover;
    if (
      current?.key === next?.key &&
      current?.normal.x === next?.normal.x &&
      current?.normal.y === next?.normal.y &&
      current?.normal.z === next?.normal.z
    ) {
      return;
    }
    this.#faceHover = next;
    this.#drawFace();
    if (this.#view) {
      this.#scene.render();
      // A new outline's shader compiles after this frame, which then draws nothing of it.
      this.#scene.executeWhenReady(() => this.#scene.render());
    }
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
    this.#redraw();
  }

  /** Whether the axes are drawn. */
  get axes(): boolean {
    return this.#axes?.isEnabled() ?? false;
  }

  /** Shows or hides the x, y and z axes in red, green and blue, made the first time they show. */
  setAxes(visible: boolean): void {
    if (visible === this.axes) {
      return;
    }
    if (visible && !this.#axes) {
      this.#axes = this.#createAxes();
    }
    this.#axes?.setEnabled(visible);
    this.#redraw();
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
    this.#placeGround();
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
   * on so a drag shows; a drag carries the `group` items along, each by the same move, turn or scale about its own
   * centre, and `onEnd` gets the world transforms of the item and of the group when it ends. A `uniform` scale gizmo
   * keeps only its even handle, for an item whose aspect is locked.
   */
  attachGizmo(
    key: string | undefined,
    mode: GizmoMode | undefined,
    onEnd: (after: WorldTransform, group: Record<string, WorldTransform>) => void,
    { uniform = false, group = [] }: { uniform?: boolean; group?: string[] } = {},
  ): void {
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
    const scale = gizmos.gizmos.scaleGizmo;
    if (scale) {
      for (const axis of [scale.xGizmo, scale.yGizmo, scale.zGizmo]) {
        axis.isEnabled = !uniform;
      }
    }
    this.#applySnap();
    this.#gizmoEnd = onEnd;
    this.#group = group.filter((other) => other !== key);
    for (const gizmo of [gizmos.gizmos.positionGizmo, gizmos.gizmos.rotationGizmo, gizmos.gizmos.scaleGizmo]) {
      if (gizmo && !this.#observed.has(gizmo)) {
        this.#observed.add(gizmo);
        gizmo.onDragStartObservable.add(() => {
          this.#dragged = true;
          const attached = gizmo.attachedMesh;
          if (attached) {
            attached.computeWorldMatrix(true);
            const position = attached.position.clone();
            this.#drag = {
              position,
              rotation: (attached.rotationQuaternion?.toEulerAngles() ?? attached.rotation).clone(),
              turn: turnOf(attached),
              scaling: attached.scaling.clone(),
              free: position.clone(),
              last: position.clone(),
              corner: attached.getBoundingInfo().boundingBox.minimumWorld.subtract(position),
              group: this.#group.flatMap((other) => {
                const mesh = this.#items.get(other)?.surface;
                return mesh
                  ? [{ mesh, position: mesh.position.clone(), turn: turnOf(mesh), scaling: mesh.scaling.clone() }]
                  : [];
              }),
            };
          }
        });
        gizmo.onDragObservable.add(() => {
          const attached = gizmo.attachedMesh;
          if (attached && this.#drag) {
            gizmo === gizmos.gizmos.positionGizmo && this.#moveTo(attached, false);
            this.#follow(attached);
          }
        });
        gizmo.onDragEndObservable.add(() => {
          const attached = gizmo.attachedMesh;
          const group: Record<string, WorldTransform> = {};
          if (attached && this.#drag) {
            gizmo === gizmos.gizmos.positionGizmo ? this.#moveTo(attached, true) : this.#land(attached);
            this.#follow(attached);
            for (const other of this.#group) {
              const mesh = this.#items.get(other)?.surface;
              mesh && (group[other] = worldTransform(mesh));
            }
          }
          this.#drag = undefined;
          attached && this.#gizmoEnd?.(worldTransform(attached), group);
        });
      }
    }
    if (!this.#looping) {
      this.#looping = true;
      this.#engine.runRenderLoop(() => this.#scene.render());
    }
  }

  /** Whether the scale gizmo offers its per-axis handles, as well as the even one. */
  get scaleAxes(): boolean | undefined {
    const scale = this.#gizmos?.gizmos.scaleGizmo;
    return scale ? [scale.xGizmo, scale.yGizmo, scale.zGizmo].every((axis) => axis.isEnabled) : undefined;
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
    this.#faceHover = undefined;
    this.#drawFace();
    this.#highlight.dispose();
    this.#gizmos?.dispose();
    this.#layers?.normal.dispose();
    this.#layers?.depth.dispose();
    this.#looping && this.#engine.stopRenderLoop();
    this.#release(Date.now() + DECODE_WAIT);
  }

  /** Babylon draws the decoded PBR lookup texture with its scene once a shader compiles, so the scene outlives the decode. */
  #release(deadline: number): void {
    const lookup = this.#scene.environmentBRDFTexture;
    if (lookup && !lookup.isReady() && Date.now() < deadline) {
      setTimeout(() => this.#release(deadline), DECODE_POLL);
      return;
    }
    this.#scene.dispose();
    this.#engine.dispose();
  }

  // The gizmos move freely, as a 2D drag does: `#moveTo` holds a move near the grid and lands it, `#land` a turn or scale.
  #applySnap(): void {
    const gizmos = this.#gizmos?.gizmos;
    gizmos?.positionGizmo && (gizmos.positionGizmo.snapDistance = 0);
    gizmos?.rotationGizmo && (gizmos.rotationGizmo.snapDistance = 0);
    gizmos?.scaleGizmo && (gizmos.scaleGizmo.snapDistance = 0);
  }

  /**
   * Puts a mesh the move gizmo is dragging where the pointer has taken it, its box's low corner held on a grid line it
   * passes within `DETENT_PX` of, or on the nearest line when `landing`; only the axes the drag moved along are held.
   */
  #moveTo(mesh: AbstractMesh, landing: boolean): void {
    const drag = this.#drag;
    if (!drag) {
      return;
    }
    // The gizmo moved the mesh on from where it was last put; the pointer alone would have moved it as far.
    drag.free.addInPlace(mesh.position.subtract(drag.last));
    const step = this.gizmoSnap.move;
    const target = drag.free.clone();
    for (const axis of ['x', 'y', 'z'] as const) {
      if (step > 0 && Math.abs(drag.free[axis] - drag.position[axis]) > 1e-6) {
        const corner = drag.free[axis] + drag.corner[axis];
        const direction = new Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0);
        const pixels = this.#pixelsPerUnit(mesh.getAbsolutePosition(), direction);
        const held = landing ? snapTo(corner, step) : magnetTo(corner, step, pixels > 0 ? DETENT_PX / pixels : 0);
        target[axis] += held - corner;
      }
    }
    mesh.position.copyFrom(target);
    // The gizmo adds its next step to the world matrix, which would otherwise still hold the unheld position.
    mesh.computeWorldMatrix(true);
    drag.last = target;
  }

  /** Carries the group along by the move, turn and scale the gizmo has given `lead` since the drag began. */
  #follow(lead: AbstractMesh): void {
    const drag = this.#drag;
    if (!drag || drag.group.length === 0) {
      return;
    }
    const moved = lead.position.subtract(drag.position);
    const turned = turnOf(lead).multiply(Quaternion.Inverse(drag.turn));
    const scaled = new Vector3(
      lead.scaling.x / drag.scaling.x,
      lead.scaling.y / drag.scaling.y,
      lead.scaling.z / drag.scaling.z,
    );
    for (const { mesh, position, turn, scaling } of drag.group) {
      mesh.position.copyFrom(position.add(moved));
      mesh.rotationQuaternion = turned.multiply(turn);
      mesh.scaling.copyFrom(scaling.multiply(scaled));
      mesh.computeWorldMatrix(true);
    }
  }

  /** Lands a turn or a scale the gizmo has ended on the step nearest it, for each component the drag changed. */
  #land(mesh: AbstractMesh): void {
    const drag = this.#drag;
    const { rotate, scale } = this.gizmoSnap;
    if (!drag) {
      return;
    }
    const changed = (from: Vector3, to: Vector3, step: number) =>
      new Vector3(
        Math.abs(to.x - from.x) > 1e-6 ? snapTo(to.x, step) : to.x,
        Math.abs(to.y - from.y) > 1e-6 ? snapTo(to.y, step) : to.y,
        Math.abs(to.z - from.z) > 1e-6 ? snapTo(to.z, step) : to.z,
      );
    if (rotate > 0 && mesh.rotationQuaternion) {
      const rotation = changed(drag.rotation, mesh.rotationQuaternion.toEulerAngles(), radians(rotate));
      mesh.rotationQuaternion = Quaternion.FromEulerVector(rotation);
    }
    if (scale > 0) {
      const scaling = changed(drag.scaling, mesh.scaling, scale);
      // A size never lands on nothing.
      mesh.scaling.set(Math.max(scaling.x, scale), Math.max(scaling.y, scale), Math.max(scaling.z, scale));
    }
    mesh.computeWorldMatrix(true);
  }

  /** The CSS pixels one unit along `direction` spans on screen at `point`. */
  #pixelsPerUnit(point: Vector3, direction: Vector3): number {
    const width = this.#engine.getRenderWidth();
    const height = this.#engine.getRenderHeight();
    const transform = this.#scene.getTransformMatrix();
    const viewport = this.#camera.viewport.toGlobal(width, height);
    const from = Vector3.Project(point, Matrix.IdentityReadOnly, transform, viewport);
    const to = Vector3.Project(point.add(direction), Matrix.IdentityReadOnly, transform, viewport);
    return Math.hypot(to.x - from.x, to.y - from.y) * this.#engine.getHardwareScalingLevel();
  }

  /**
   * Draws a still view again after a guide shows or hides; a guide shown for the first time compiles its shader
   * asynchronously, so its first frame draws without it and the view draws again once it is ready.
   */
  #redraw(): void {
    if (!this.#view) {
      return;
    }
    this.#scene.render();
    this.#scene.executeWhenReady(() => this.#scene.render());
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
        this.#excluded.delete(surface);
        this.#highlight.removeExcludedMesh(surface);
        this.#highlight.addMesh(surface, color);
      } else if (!selected && this.#highlight.hasMesh(surface)) {
        this.#highlight.removeMesh(surface);
        this.#exclude(surface);
      }
    }
    // A box is rebuilt only when its item's bounds or the colour change: a new box is not drawn until its material is
    // ready, so one rebuilt on every frame of an orbit flickers.
    for (const [key, box] of this.#boxes) {
      const surface = this.#items.get(key)?.surface;
      if (!surface || !this.#selected.has(key) || !box.mesh.color.equals(color) || !sameBounds(surface, box)) {
        box.mesh.dispose();
        this.#boxes.delete(key);
      }
    }
    for (const [key, { surface }] of this.#items) {
      if (this.#selected.has(key) && !this.#boxes.has(key)) {
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
    mesh.renderingGroupId = OVERLAY_GROUP;
    return { mesh, min: min.clone(), max: max.clone() };
  }

  /**
   * The side of item `key`'s world-aligned bounds that `normal` (an axis) points out of, a little proud of it: its
   * centre, its two other extents and its corners in order round it.
   */
  #faceBounds(
    key: string,
    normal: Model.Vec3,
  ): { center: Vector3; width: number; height: number; corners: Vector3[] } | undefined {
    const surface = this.#items.get(key)?.surface;
    if (!surface) {
      return undefined;
    }
    surface.computeWorldMatrix(true);
    const { minimumWorld: min, maximumWorld: max } = surface.getBoundingInfo().boundingBox;
    const { x: nx, y: ny, z: nz } = normal;
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
    // Half the face's extent along each of the two axes it spans, so its corners go round it.
    const [across, up] =
      nx !== 0
        ? [new Vector3(0, 0, size.z / 2), new Vector3(0, size.y / 2, 0)]
        : ny !== 0
          ? [new Vector3(size.x / 2, 0, 0), new Vector3(0, 0, size.z / 2)]
          : [new Vector3(size.x / 2, 0, 0), new Vector3(0, size.y / 2, 0)];
    const corners = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([a, b]) => center.add(across.scale(a)).add(up.scale(b)));
    return { center, width, height, corners };
  }

  /** A pane over a face's bounds in the selection colour, at `alpha`. */
  #facePane(
    name: string,
    bounds: { center: Vector3; width: number; height: number },
    normal: Model.Vec3,
    alpha: number,
  ): Mesh {
    const mesh = CreatePlane(
      name,
      { width: bounds.width, height: bounds.height, sideOrientation: Mesh.DOUBLESIDE },
      this.#scene,
    );
    mesh.position = bounds.center;
    mesh.rotation =
      normal.x !== 0
        ? new Vector3(0, Math.PI / 2, 0)
        : normal.y !== 0
          ? new Vector3(Math.PI / 2, 0, 0)
          : Vector3.Zero();
    const material = new StandardMaterial(name, this.#scene);
    material.emissiveColor = Color3.FromHexString(this.#selection);
    material.disableLighting = true;
    material.alpha = alpha;
    mesh.material = material;
    mesh.isPickable = false;
    return mesh;
  }

  /** The selected face as a translucent pane; the hovered one tinted faintly and outlined; both in the selection colour. */
  #drawFace(): void {
    this.#faceMesh?.mesh.dispose();
    this.#faceMesh = undefined;
    this.#faceHoverMesh?.fill.dispose();
    this.#faceHoverMesh?.line.dispose();
    this.#faceHoverMesh = undefined;
    const selection = this.#faceSelection;
    const bounds = selection && this.#faceBounds(selection.key, selection.normal);
    if (selection && bounds) {
      const mesh = this.#facePane(`face-${selection.key}`, bounds, selection.normal, 0.35);
      this.#faceMesh = { mesh, center: bounds.center.clone() };
    }
    const hover = this.#faceHover;
    const outlined = hover && this.#faceBounds(hover.key, hover.normal);
    if (hover && outlined) {
      const fill = this.#facePane(`face-hover-fill-${hover.key}`, outlined, hover.normal, 0.15);
      const outline = [...outlined.corners, outlined.corners[0]];
      const line = CreateLines(`face-hover-${hover.key}`, { points: outline }, this.#scene);
      line.color = Color3.FromHexString(this.#selection);
      line.isPickable = false;
      // Drawn over the item, as the selection's box is, so no edge of it hides the outline.
      line.renderingGroupId = OVERLAY_GROUP;
      this.#faceHoverMesh = { fill, line, outline };
    }
  }

  #exclude(mesh: Mesh): void {
    if (this.#excluded.has(mesh) || this.#highlight.hasMesh(mesh)) {
      return;
    }
    this.#excluded.add(mesh);
    this.#highlight.addExcludedMesh(mesh);
    if (!this.#watched.has(mesh)) {
      this.#watched.add(mesh);
      mesh.onDisposeObservable.addOnce(() => {
        this.#excluded.delete(mesh);
        this.#highlight.removeExcludedMesh(mesh);
      });
    }
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
    const tint = this.#palette
      ? Color3.FromHexString(this.#palette.ground).scale(0.8)
      : Color3.FromHexString(this.#theme === 'presentation' ? '#8da2e0' : '#9aa1ad');
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

  #createAxes(): LinesMesh {
    const axes = groundAxes(GRID_EXTENT);
    const mesh = CreateLineSystem(
      'axes',
      {
        lines: axes.map(({ from, to }) => [Vector3.FromArray(from), Vector3.FromArray(to)]),
        colors: axes.map(({ color }) => [Color4.FromHexString(`${color}ff`), Color4.FromHexString(`${color}ff`)]),
      },
      this.#scene,
    );
    // A guide, as the grid is.
    mesh.isPickable = false;
    return mesh;
  }

  /**
   * Neu's ground: a plane in the ground tone lit by one light straight down, so it matches the background exactly where
   * nothing shades it, and darkens softly under each item. The items' own lights are a soft sky and a weak key from the
   * upper left, which model the bodies without a hard edge.
   */
  #createNeuGround(palette: NeuPalette, mode: ThemeMode): { mesh: Mesh; shadows: ShadowGenerator } {
    const ground = Color3.FromHexString(palette.ground);
    const sky = new HemisphericLight('ambient', new Vector3(0, 1, 0), this.#scene);
    sky.intensity = NEU_LIGHTS[mode].sky;
    sky.groundColor = ground.scale(0.75);
    const key = new DirectionalLight('key', new Vector3(1, -2, -1), this.#scene);
    key.intensity = NEU_LIGHTS[mode].key;
    key.specular = Color3.Black();

    const mesh = CreateGround('ground', { width: NEU_GROUND_EXTENT * 2, height: NEU_GROUND_EXTENT * 2 }, this.#scene);
    mesh.isPickable = false;
    mesh.receiveShadows = true;
    const material = new StandardMaterial('ground', this.#scene);
    material.diffuseColor = ground;
    material.specularColor = Color3.Black();
    // Drawn first (its material is the scene's first) and leaving no depth, so a body reaching below it still shows.
    material.disableDepthWrite = true;
    mesh.material = material;
    sky.excludedMeshes.push(mesh);
    key.excludedMeshes.push(mesh);

    const contact = new DirectionalLight('contact', new Vector3(0, -1, 0), this.#scene);
    contact.position = new Vector3(0, 100, 0);
    contact.intensity = 1;
    contact.specular = Color3.Black();
    contact.includedOnlyMeshes.push(mesh);
    // Blurred a little past the footprint: a soft pool at each body's foot, not a halo trailing away from it.
    const shadows = new ShadowGenerator(1024, contact);
    shadows.useBlurExponentialShadowMap = true;
    shadows.useKernelBlur = true;
    shadows.blurKernel = 32;
    shadows.setDarkness(NEU_SHADOW_DARKNESS[mode]);
    return { mesh, shadows };
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
      const { positions, indices, normals } = creasedNormals(data);
      const vertices = new VertexData();
      vertices.positions = positions;
      vertices.indices = indices;
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
    const material = createSurfaceMaterial(this.#scene, `surface-${item.key}`, spec.kind === 'rim' ? 'pbr' : spec.kind);
    surface.material = material;
    // A sphere has no edge, and its pole fans would draw as stray dots; Neu's rim carries its hue instead.
    if (spec.edges && !(spec.kind === 'neu' && item.type === 'sphere')) {
      surface.enableEdgesRendering();
      surface.edgesWidth = 2;
      // Darker than the surface, so the edges read against it; Neu's body is the ground, so its edges are the hue itself.
      const edge = Color3.FromHexString(spec.color).scale(spec.kind === 'neu' ? 1 : 0.45);
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

  /**
   * Sets the Neu ground at the grid's plane, or just under the lowest solid body when one reaches below it, so each
   * contact shadow lies at its body's foot. A see-through shell or a composite's frame casts no shadow and is left out:
   * a large one would drop the ground far below the bodies inside it and part their shadows from them.
   */
  #placeGround(): void {
    if (!this.#ground) {
      return;
    }
    let lowest = Infinity;
    for (const surface of this.#ground.shadows.getShadowMap()?.renderList ?? []) {
      if (surface.isEnabled()) {
        surface.computeWorldMatrix(true);
        lowest = Math.min(lowest, surface.getBoundingInfo().boundingBox.minimumWorld.y);
      }
    }
    // A hair below, so a face resting on the ground does not fight it.
    this.#ground.mesh.position.y = Math.min(lowest, 0) - 0.002;
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
      if (this.#ground) {
        if (castsNeuShadow(spec, item)) {
          this.#ground.shadows.addShadowCaster(surface);
        } else {
          this.#ground.shadows.removeShadowCaster(surface);
        }
      }
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
      // A rim shell's surface is nearly clear; the rim and lattice carry its colour. A Neu body is the ground's tone.
      const body = this.#palette && spec.kind === 'neu' ? Color3.FromHexString(this.#palette.ground) : color;
      setSurface(material, body, spec.kind === 'rim' ? spec.alpha * 0.25 : spec.alpha);
      if (spec.kind === 'neu') {
        // A solid sphere's rim carries its hue; any other body's edges do, a rim on its flat faces would wash them, and
        // one round a see-through shell tints everything seen through it.
        setNeuAccent(material, item.type === 'sphere' && castsNeuShadow(spec, item) ? color : Color3.Black());
        surface.edgesColor = new Color4(color.r, color.g, color.b, 1);
      }
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
        // A Neu link is a darker line of the ground, as a 2D Neu link is a groove in it.
        line.color = this.#palette
          ? Color3.FromHexString(this.#palette.ground).scale(0.6)
          : Color3.FromHexString(this.#theme === 'presentation' ? '#8ea2e6' : '#555b66');
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
