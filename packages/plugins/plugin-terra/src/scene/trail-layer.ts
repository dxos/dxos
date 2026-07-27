//
// Copyright 2026 DXOS.org
//

import '@babylonjs/core/Meshes/thinInstanceMesh';

import { Material } from '@babylonjs/core/Materials/material';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { type Mesh } from '@babylonjs/core/Meshes/mesh';
import { type Scene } from '@babylonjs/core/scene';

import { type Vec3, scale, sub } from '../engine';
import { type SimObject } from '../sim/engine';
import { tangentFrame } from '../sim/geo';
import { type Trail, TRAIL_SPECS, type TrailSpec, activePuffs, createTrail, emit } from '../sim/trail';
import { type TerraObject } from '../types';

const DEG = Math.PI / 180;

/** Puffs are small, numerous, and never seen up close, so a low-poly sphere is indistinguishable from a smooth one. */
const PUFF_SEGMENTS = 6;

/** Renders after the planet's default group 0, so trails never appear to sink beneath the terrain they float over. */
const TRAIL_RENDERING_GROUP = 1;

/** A puff ready to render: its world position, instance scale, and instance alpha. */
type RenderPuff = { position: Vec3; radius: number; alpha: number };

/**
 * World-space forward tangent at `unit`, derived from `bearing` (degrees) via the local north/east
 * frame — mirrors `object-layer.ts`'s `forwardAt`, kept separate since that one returns a Babylon
 * `Vector3` and this one stays in plain `Vec3` for reuse with `sim/trail`'s pure arithmetic.
 */
const forwardAt = (unit: Vec3, bearing: number): Vec3 => {
  const { north, east } = tangentFrame(unit);
  const radians = bearing * DEG;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [north[0] * cos + east[0] * sin, north[1] * cos + east[1] * sin, north[2] * cos + east[2] * sin];
};

/**
 * The point behind an object's hull, opposite its direction of travel, where a fresh puff is
 * emitted — so the trail reads as a wake rather than spheres intersecting the object.
 */
const emissionPoint = (state: SimObject['state'], spec: TrailSpec): Vec3 =>
  sub(scale(state.unit, state.radius), scale(forwardAt(state.unit, state.bearing), spec.spacing));

/** Puffs younger than `spec.lifetimeMs` for one object, grown and faded by their normalized age. */
const renderPuffsFor = (trail: Trail, nowMs: number, spec: TrailSpec): RenderPuff[] =>
  activePuffs(trail, nowMs, spec).map(({ position, age }) => ({
    position,
    radius: spec.startRadius * (1 + (spec.endScale - 1) * age),
    alpha: spec.startAlpha * (1 - age),
  }));

/**
 * Renders ephemeral smoke/wake trails for ships, planes, and rockets as thin-instanced spheres
 * that grow and fade with age. Trails are pure render state derived from `SimObject` positions —
 * never persisted, never replicated — so a `Trail` here is keyed by object identity and rebuilt
 * from scratch whenever `TerraArticle` swaps in a fresh `SimEngine`.
 */
export class TrailLayer {
  readonly #base: Mesh;
  readonly #trails = new Map<TerraObject.TerraObject, Trail>();
  #matrixBuffer: Float32Array | undefined;
  #colorBuffer: Float32Array | undefined;

  constructor(options: { scene: Scene }) {
    this.#base = CreateSphere('trailPuff', { diameter: 1, segments: PUFF_SEGMENTS }, options.scene);
    this.#base.material = this.#createMaterial(options.scene);
    this.#base.isVisible = false;
    this.#base.renderingGroupId = TRAIL_RENDERING_GROUP;
  }

  /** Matte, unlit-white, alpha-blended, depth-write-disabled so overlapping puffs blend rather than z-fight. */
  #createMaterial(scene: Scene): StandardMaterial {
    const material = new StandardMaterial('trailPuffMat', scene);
    material.diffuseColor = new Color3(1, 1, 1);
    material.specularColor = new Color3(0, 0, 0);
    material.emissiveColor = new Color3(1, 1, 1);
    material.disableLighting = true;
    // Forces the blend pipeline regardless of the (irrelevant, always-1) material-level alpha, so
    // each instance's own alpha — set per-puff below — is what actually varies on screen.
    material.transparencyMode = Material.MATERIAL_ALPHABLEND;
    material.disableDepthWrite = true;
    return material;
  }

  update(objects: readonly SimObject[], nowMs: number): void {
    const live = new Set<TerraObject.TerraObject>();
    const rendered: RenderPuff[] = [];

    for (const object of objects) {
      const spec = TRAIL_SPECS[object.definition.kind];
      if (!spec) {
        continue;
      }
      live.add(object.definition);

      const trail = this.#trails.get(object.definition) ?? createTrail(spec.capacity);
      const updated = emit(trail, emissionPoint(object.state, spec), nowMs, spec);
      this.#trails.set(object.definition, updated);

      rendered.push(...renderPuffsFor(updated, nowMs, spec));
    }

    // Drops trails for objects no longer simulated — removed, or orphaned by a freshly rebuilt SimEngine.
    for (const definition of this.#trails.keys()) {
      if (!live.has(definition)) {
        this.#trails.delete(definition);
      }
    }

    this.#rebuild(rendered);
  }

  #rebuild(puffs: readonly RenderPuff[]): void {
    const neededMatrix = puffs.length * 16;
    const neededColor = puffs.length * 4;
    const reallocate = !this.#matrixBuffer || this.#matrixBuffer.length !== neededMatrix;

    const matrixBuffer = reallocate ? new Float32Array(neededMatrix) : this.#matrixBuffer;
    const colorBuffer = reallocate ? new Float32Array(neededColor) : this.#colorBuffer;
    if (!matrixBuffer || !colorBuffer) {
      return;
    }

    puffs.forEach((puff, index) => {
      const scaling = new Vector3(puff.radius, puff.radius, puff.radius);
      const position = new Vector3(puff.position[0], puff.position[1], puff.position[2]);
      Matrix.Compose(scaling, Quaternion.Identity(), position).copyToArray(matrixBuffer, index * 16);
      colorBuffer[index * 4] = 1;
      colorBuffer[index * 4 + 1] = 1;
      colorBuffer[index * 4 + 2] = 1;
      colorBuffer[index * 4 + 3] = puff.alpha;
    });

    if (reallocate) {
      // `staticBuffer: false` is load-bearing — Babylon builds the GPU buffer with
      // `updatable = !staticBuffer`, so a static buffer silently ignores every later
      // `thinInstanceBufferUpdated` and puffs freeze at their first position and alpha.
      this.#base.thinInstanceSetBuffer('matrix', matrixBuffer, 16, false);
      this.#base.thinInstanceSetBuffer('color', colorBuffer, 4, false);
      this.#matrixBuffer = matrixBuffer;
      this.#colorBuffer = colorBuffer;
    } else {
      this.#base.thinInstanceBufferUpdated('matrix');
      this.#base.thinInstanceBufferUpdated('color');
    }

    this.#base.isVisible = puffs.length > 0;
  }

  dispose(): void {
    // Mesh.dispose() defaults to leaving materials alive; the base owns its own matte material.
    this.#base.dispose(false, true);
  }
}
