//
// Copyright 2026 DXOS.org
//

import '@babylonjs/core/Meshes/thinInstanceMesh';

import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math';
import { type Mesh } from '@babylonjs/core/Meshes/mesh';
import { type Scene } from '@babylonjs/core/scene';

import { type Vec3, scale } from '../engine';
import { type SimObject } from '../sim/engine';
import { tangentFrame } from '../sim/geo';
import { type TerraObject } from '../types';
import { createObjectForm } from './object-forms';

/** Every kind `createObjectForm` builds a base mesh for, in a fixed iteration order. */
const KINDS: readonly TerraObject.Kind[] = ['boat', 'plane', 'satellite', 'tank', 'rocket'];

/** Instance scale relative to each object's own surface/orbit radius, so scale stays planet-relative at any zoom. */
const SCALE_FACTOR = 0.02;

const DEG = Math.PI / 180;

/** World-space forward tangent at `unit`, derived from `bearing` (degrees) via the local north/east frame. */
const forwardAt = (unit: Vec3, bearing: number): Vector3 => {
  const { north, east } = tangentFrame(unit);
  const radians = bearing * DEG;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return new Vector3(north[0] * cos + east[0] * sin, north[1] * cos + east[1] * sin, north[2] * cos + east[2] * sin);
};

/**
 * The thin-instance matrix for one object: positioned at `scale(state.unit, state.radius)`,
 * oriented with forward along the velocity direction (from `bearing`) and up along the surface
 * normal (`state.unit`) — satellites' orbit tangent is already stored as `bearing` by `stepOrbit`.
 */
const matrixFor = ({ state }: SimObject): Matrix => {
  const position = scale(state.unit, state.radius);
  const forward = forwardAt(state.unit, state.bearing);
  const up = new Vector3(state.unit[0], state.unit[1], state.unit[2]);
  const rotation = Quaternion.FromLookDirectionLH(forward, up);
  const scaling = state.radius * SCALE_FACTOR;
  return Matrix.Compose(
    new Vector3(scaling, scaling, scaling),
    rotation,
    new Vector3(position[0], position[1], position[2]),
  );
};

/**
 * Renders `SimObject`s as thin instances, one base mesh per kind. A kind's instance buffer is
 * reallocated only when its object count changes; otherwise the same buffer is overwritten in
 * place and pushed to the GPU with `thinInstanceBufferUpdated`, avoiding a per-frame reallocation.
 */
export class ObjectLayer {
  readonly #bases = new Map<TerraObject.Kind, Mesh>();
  readonly #buffers = new Map<TerraObject.Kind, Float32Array>();

  constructor(options: { scene: Scene }) {
    for (const kind of KINDS) {
      this.#bases.set(kind, createObjectForm(kind, options.scene));
    }
  }

  update(objects: readonly SimObject[]): void {
    const byKind = new Map<TerraObject.Kind, SimObject[]>(KINDS.map((kind) => [kind, []]));
    for (const object of objects) {
      byKind.get(object.definition.kind)?.push(object);
    }

    for (const kind of KINDS) {
      const base = this.#bases.get(kind);
      if (!base) {
        continue;
      }

      const group = byKind.get(kind) ?? [];
      const needed = group.length * 16;
      const existing = this.#buffers.get(kind);

      if (!existing || existing.length !== needed) {
        const buffer = new Float32Array(needed);
        group.forEach((object, index) => matrixFor(object).copyToArray(buffer, index * 16));
        base.thinInstanceSetBuffer('matrix', buffer, 16, true);
        this.#buffers.set(kind, buffer);
      } else {
        group.forEach((object, index) => matrixFor(object).copyToArray(existing, index * 16));
        base.thinInstanceBufferUpdated('matrix');
      }

      base.isVisible = group.length > 0;
    }
  }

  dispose(): void {
    // Mesh.dispose() defaults to leaving materials alive; each base owns its own matte material.
    this.#bases.forEach((base) => base.dispose(false, true));
    this.#bases.clear();
    this.#buffers.clear();
  }
}
