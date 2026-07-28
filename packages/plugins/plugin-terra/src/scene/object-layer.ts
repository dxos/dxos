//
// Copyright 2026 DXOS.org
//

import '@babylonjs/core/Meshes/thinInstanceMesh';

import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math';
import { type Mesh } from '@babylonjs/core/Meshes/mesh';
import { type Scene } from '@babylonjs/core/scene';

import { scale } from '../engine';
import { type SimObject } from '../sim';
import { type TerraObject } from '../types';
import { easeHeading } from './heading';
import { createObjectForm } from './object-forms';
import { SCALE_FACTOR, objectFrame } from './orientation';

/** Every kind `createObjectForm` builds a base mesh for, in a fixed iteration order. */
const KINDS: readonly TerraObject.Kind[] = ['boat', 'plane', 'satellite', 'tank', 'rocket'];

/**
 * The thin-instance matrix for one object: positioned at `scale(state.unit, state.radius)` and
 * oriented by its own frame at the eased render `heading` (see `orientation.ts`).
 */
const matrixFor = ({ state, definition }: SimObject, heading: number): Matrix => {
  const position = scale(state.unit, state.radius);
  const { right, up, forward } = objectFrame(state, definition.kind, heading);
  // Build the rotation from an explicit left-handed basis rather than `FromLookDirectionLH`, which
  // returns a view-style rotation that lands the mesh's local +Z on -forward — i.e. every object
  // flies tail-first. Mapping local X/Y/Z onto right/up/forward is unambiguous.
  const basis = new Matrix();
  Matrix.FromXYZAxesToRef(right, up, forward, basis);
  const rotation = Quaternion.FromRotationMatrix(basis);
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
  /** Each object's last-rendered heading, eased toward `state.bearing` a little further every frame; keyed by definition identity like `TrailLayer`'s trail map. */
  readonly #headings = new Map<TerraObject.TerraObject, number>();

  constructor(options: { scene: Scene }) {
    for (const kind of KINDS) {
      const base = createObjectForm(kind, options.scene);
      // Babylon only recomputes a thin-instance mesh's bounding box inside `thinInstanceSetBuffer`,
      // which `update` calls only when the instance count changes — so the box otherwise stays
      // frozen wherever the objects were on that frame. Once they have moved on, a camera that no
      // longer sees the stale box culls the whole kind, which is why a followed object could vanish
      // from a close-up camera. Refreshing every frame would walk every instance for a cull that
      // buys nothing anyway: these objects are spread across the entire globe, so the box spans it.
      base.alwaysSelectAsActiveMesh = true;
      this.#bases.set(kind, base);
    }
  }

  /**
   * The heading `definition` was last drawn at, or `undefined` before its first frame. Lets another
   * consumer — the chase camera — orient off exactly the heading the mesh is rendered at, rather
   * than `state.bearing`, which the easing lags behind through every turn.
   */
  renderHeading(definition: TerraObject.TerraObject): number | undefined {
    return this.#headings.get(definition);
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
    const byKind = new Map<TerraObject.Kind, SimObject[]>(KINDS.map((kind) => [kind, []]));
    const live = new Set<TerraObject.TerraObject>();
    for (const object of objects) {
      byKind.get(object.definition.kind)?.push(object);
      live.add(object.definition);
    }

    // Drops headings for objects no longer simulated — removed, or orphaned by a freshly rebuilt SimEngine.
    for (const definition of this.#headings.keys()) {
      if (!live.has(definition)) {
        this.#headings.delete(definition);
      }
    }

    for (const kind of KINDS) {
      const base = this.#bases.get(kind);
      if (!base) {
        continue;
      }

      const group = byKind.get(kind) ?? [];
      // Skip empty kinds outright: a zero-length thin-instance buffer is never useful and keeps
      // Babylon from having to reason about an instance count of 0.
      if (group.length === 0) {
        base.isVisible = false;
        continue;
      }

      const needed = group.length * 16;
      const existing = this.#buffers.get(kind);

      if (!existing || existing.length !== needed) {
        const buffer = new Float32Array(needed);
        group.forEach((object, index) =>
          matrixFor(object, this.#headingFor(object, deltaMs)).copyToArray(buffer, index * 16),
        );
        // `staticBuffer: false` is load-bearing — Babylon builds the GPU buffer with
        // `updatable = !staticBuffer`, so a static buffer silently ignores every later
        // `thinInstanceBufferUpdated` and the objects render frozen at their first position.
        base.thinInstanceSetBuffer('matrix', buffer, 16, false);
        this.#buffers.set(kind, buffer);
      } else {
        group.forEach((object, index) =>
          matrixFor(object, this.#headingFor(object, deltaMs)).copyToArray(existing, index * 16),
        );
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
    this.#headings.clear();
  }
}
