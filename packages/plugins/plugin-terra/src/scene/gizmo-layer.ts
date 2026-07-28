//
// Copyright 2026 DXOS.org
//

import '@babylonjs/core/Meshes/thinInstanceMesh';

import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { type Mesh } from '@babylonjs/core/Meshes/mesh';
import { type Scene } from '@babylonjs/core/scene';

import { scale } from '../engine';
import { type SimObject } from '../sim';
import { type TerraObject } from '../types';
import { easeHeading } from './heading';
import { SCALE_FACTOR, objectFrame } from './orientation';

/** The three local axes drawn per object: right, up (surface normal), and forward (heading). */
export type Axis = 'right' | 'up' | 'forward';

export const AXES: readonly Axis[] = ['right', 'up', 'forward'];

/** Conventional RGB axis colours: red/green/blue for right/up/forward. */
const AXIS_COLORS: Record<Axis, Color3> = {
  right: new Color3(0.95, 0.2, 0.2),
  up: new Color3(0.2, 0.95, 0.3),
  forward: new Color3(0.25, 0.45, 0.98),
};

/** Axis rod length as a multiple of the object's own instance scale, so a rod visibly clears its mesh. */
const LENGTH_FACTOR = 3;

/** Axis rod thickness as a multiple of the object's own instance scale. */
const THICKNESS_FACTOR = 0.35;

/** An object's (or standalone placement's) orientation as an explicit right-handed basis. */
export type GizmoBasis = { right: Vector3; up: Vector3; forward: Vector3 };

/**
 * The local axes and outward world direction for rod `axis`, given the object's own `basis` — a
 * cyclic permutation of `(right, up, forward)`, which is itself right-handed, so every permutation
 * below is too. Each case is chosen so the rod's local +Y (the cylinder builder's own axis) lands on
 * the world direction the rod represents.
 */
const axisFrame = (
  basis: GizmoBasis,
  axis: Axis,
): { xAxis: Vector3; yAxis: Vector3; zAxis: Vector3; direction: Vector3 } => {
  switch (axis) {
    case 'up':
      return { xAxis: basis.right, yAxis: basis.up, zAxis: basis.forward, direction: basis.up };
    case 'forward':
      return { xAxis: basis.up, yAxis: basis.forward, zAxis: basis.right, direction: basis.forward };
    case 'right':
      return { xAxis: basis.forward, yAxis: basis.right, zAxis: basis.up, direction: basis.right };
  }
};

/** Unlit, emissive-only material so each axis's colour stays vivid regardless of scene lighting. */
const createAxisMaterial = (axis: Axis, scene: Scene): StandardMaterial => {
  const material = new StandardMaterial(`gizmo-${axis}-material`, scene);
  material.diffuseColor = Color3.Black();
  material.specularColor = Color3.Black();
  material.emissiveColor = AXIS_COLORS[axis];
  material.disableLighting = true;
  return material;
};

/** A thin unit-height cylinder along local +Y, coloured for `axis`, hidden until instanced or placed. */
const createAxisForm = (axis: Axis, scene: Scene): Mesh => {
  const mesh = CreateCylinder(
    `gizmo-${axis}`,
    { height: 1, diameterTop: 0.15, diameterBottom: 0.15, tessellation: 8 },
    scene,
  );
  mesh.material = createAxisMaterial(axis, scene);
  mesh.isVisible = false;
  return mesh;
};

/**
 * The rotation and translation for one `axis` rod at `position`/`basis`/`scale` — shared by
 * `GizmoLayer`'s per-frame thin-instance matrices and `createGizmo`'s one-off standalone meshes, so
 * both draw exactly the same rod.
 */
const axisTransform = (
  position: Vector3,
  basis: GizmoBasis,
  objectScale: number,
  axis: Axis,
): { rotation: Quaternion; scaling: Vector3; position: Vector3 } => {
  const frame = axisFrame(basis, axis);
  const basisMatrix = new Matrix();
  Matrix.FromXYZAxesToRef(frame.xAxis, frame.yAxis, frame.zAxis, basisMatrix);
  const rotation = Quaternion.FromRotationMatrix(basisMatrix);

  const length = objectScale * LENGTH_FACTOR;
  const thickness = objectScale * THICKNESS_FACTOR;
  // Shifts the rod so it starts at the object's own centre and extends outward, rather than the
  // cylinder builder's default of straddling the origin.
  const offset = frame.direction.scale(length * 0.5);

  return { rotation, scaling: new Vector3(thickness, length, thickness), position: position.add(offset) };
};

/**
 * The thin-instance matrix for one object's `axis` rod at its current sim state and eased
 * `heading`. Uses the same `objectFrame` the mesh itself is oriented by, so the rods track the
 * rendered form exactly — including a rocket's pitch, which the gizmo would otherwise ignore and
 * draw level while the rocket climbed.
 */
const matrixFor = ({ state, definition }: SimObject, axis: Axis, heading: number): Matrix => {
  const position = scale(state.unit, state.radius);
  const objectScale = state.radius * SCALE_FACTOR;
  const transform = axisTransform(
    new Vector3(position[0], position[1], position[2]),
    objectFrame(state, definition.kind, heading),
    objectScale,
    axis,
  );

  return Matrix.Compose(transform.scaling, transform.rotation, transform.position);
};

/**
 * Builds one visible instance of every axis rod at `options.position`, oriented by `options.basis`
 * and sized by `options.scale` (the same rod length/thickness convention `GizmoLayer` uses for
 * live-scene thin instances) — for one-off, non-thin-instanced placements such as the object gallery.
 * The caller owns disposal of the returned meshes.
 */
export const createGizmo = (scene: Scene, options: { position: Vector3; basis: GizmoBasis; scale: number }): Mesh[] =>
  AXES.map((axis) => {
    const mesh = createAxisForm(axis, scene);
    mesh.isVisible = true;
    const transform = axisTransform(options.position, options.basis, options.scale, axis);
    mesh.rotationQuaternion = transform.rotation;
    mesh.scaling = transform.scaling;
    mesh.position = transform.position;
    return mesh;
  });

/**
 * Renders rotation gizmos — three coloured axis rods per object — as thin instances, one base
 * cylinder per axis. Mirrors `ObjectLayer`'s `update`/`dispose` shape so both layers can be driven
 * from the same render loop. Default-off: the caller (`TerraArticle`) creates/disposes this layer
 * only while the toolbar toggle is on.
 */
export class GizmoLayer {
  readonly #bases = new Map<Axis, Mesh>();
  readonly #buffers = new Map<Axis, Float32Array>();
  /** Each object's last-rendered heading, eased toward `state.bearing` a little further every frame; keyed by definition identity like `ObjectLayer`'s own map, so the gizmo tracks the rendered mesh rather than the raw (unsmoothed) sim bearing. */
  readonly #headings = new Map<TerraObject.TerraObject, number>();

  constructor(options: { scene: Scene }) {
    for (const axis of AXES) {
      const base = createAxisForm(axis, options.scene);
      // See `object-layer.ts`: the thin-instance bounding box only refreshes when the instance count
      // changes, so a stale box would cull a whole axis away from a close-up camera.
      base.alwaysSelectAsActiveMesh = true;
      this.#bases.set(axis, base);
    }
  }

  /** This frame's eased heading for `object`, remembered for the next call; never fed back into `state`. */
  #headingFor(object: SimObject, deltaMs: number): number {
    const heading = easeHeading(
      this.#headings.get(object.definition),
      object.state.bearing,
      deltaMs,
      object.definition.kind,
    );
    this.#headings.set(object.definition, heading);
    return heading;
  }

  /** `deltaMs` is real (wall-clock) time since the previous frame, driving turn-rate easing only — never the sim clock. */
  update(objects: readonly SimObject[], deltaMs: number): void {
    const live = new Set<TerraObject.TerraObject>();
    const headings = new Map<SimObject, number>();
    for (const object of objects) {
      live.add(object.definition);
      headings.set(object, this.#headingFor(object, deltaMs));
    }

    // Drops headings for objects no longer simulated — removed, or orphaned by a freshly rebuilt SimEngine.
    for (const definition of this.#headings.keys()) {
      if (!live.has(definition)) {
        this.#headings.delete(definition);
      }
    }

    for (const axis of AXES) {
      const base = this.#bases.get(axis);
      if (!base) {
        continue;
      }

      // Skip an empty set outright: a zero-length thin-instance buffer is never useful.
      if (objects.length === 0) {
        base.isVisible = false;
        continue;
      }

      const needed = objects.length * 16;
      const existing = this.#buffers.get(axis);

      if (!existing || existing.length !== needed) {
        const buffer = new Float32Array(needed);
        objects.forEach((object, index) =>
          matrixFor(object, axis, headings.get(object) ?? object.state.bearing).copyToArray(buffer, index * 16),
        );
        // `staticBuffer: false` is load-bearing — Babylon builds the GPU buffer with
        // `updatable = !staticBuffer`, so a static buffer silently ignores every later
        // `thinInstanceBufferUpdated` and the rods render frozen at their first position.
        base.thinInstanceSetBuffer('matrix', buffer, 16, false);
        this.#buffers.set(axis, buffer);
      } else {
        objects.forEach((object, index) =>
          matrixFor(object, axis, headings.get(object) ?? object.state.bearing).copyToArray(existing, index * 16),
        );
        base.thinInstanceBufferUpdated('matrix');
      }

      base.isVisible = true;
    }
  }

  dispose(): void {
    // Mesh.dispose() defaults to leaving materials alive; each base owns its own unlit material.
    this.#bases.forEach((base) => base.dispose(false, true));
    this.#bases.clear();
    this.#buffers.clear();
    this.#headings.clear();
  }
}
