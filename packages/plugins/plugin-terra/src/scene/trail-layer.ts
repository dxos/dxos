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

import { type TerraConfigValues, type Vec3 } from '../engine';
import { type SimObject, TRAIL_SPECS, type TrailSpec, trailPuffs } from '../sim';

/** Puffs are small, numerous, and never seen up close, so a low-poly sphere is indistinguishable from a smooth one. */
const PUFF_SEGMENTS = 6;

/** A puff ready to render: its world position, instance scale, and instance alpha. */
type RenderPuff = { position: Vec3; radius: number; alpha: number };

/** Puffs for one object, grown and faded by their normalized age. */
const renderPuffsFor = (object: SimObject, config: TerraConfigValues, nowMs: number, spec: TrailSpec): RenderPuff[] =>
  trailPuffs(object.state, object.definition, config, nowMs, spec).map(({ position, age }) => ({
    position,
    radius: spec.startRadius * (1 + (spec.endScale - 1) * age),
    alpha: spec.startAlpha * (1 - age),
  }));

/**
 * Renders ephemeral smoke/wake trails for ships, planes, and rockets as thin-instanced spheres
 * that grow and fade with age. Trails are the object's own real past positions, re-derived each
 * frame from `sim/trail`'s closed-form sampling — never persisted, never replicated, and never
 * accumulated across frames, so there is nothing here to key or drop by object identity.
 */
export class TrailLayer {
  readonly #base: Mesh;
  #matrixBuffer: Float32Array | undefined;
  #colorBuffer: Float32Array | undefined;

  constructor(options: { scene: Scene }) {
    this.#base = CreateSphere('trailPuff', { diameter: 1, segments: PUFF_SEGMENTS }, options.scene);
    this.#base.material = this.#createMaterial(options.scene);
    this.#base.isVisible = false;
    // Stays in the planet's default rendering group (0) rather than a later one: Babylon auto-clears
    // the depth buffer between rendering groups, so a later group has no depth information from the
    // planet and nothing in it can be occluded by opaque terrain. Sharing the group keeps puffs
    // depth-*tested* against the planet (far-side puffs are hidden) while `disableDepthWrite` below
    // still lets overlapping puffs blend with each other instead of z-fighting.
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

  /**
   * Redraws every trail-leaving object's live puffs for the sim instant `nowMs`. Holds no state
   * between calls — the puff set is derived from `(objects, config, nowMs)` alone — so a caller may
   * skip, repeat, or jump `nowMs` freely.
   */
  update(objects: readonly SimObject[], config: TerraConfigValues, nowMs: number): void {
    const rendered: RenderPuff[] = [];

    for (const object of objects) {
      const spec = TRAIL_SPECS[object.definition.kind];
      if (!spec) {
        continue;
      }
      rendered.push(...renderPuffsFor(object, config, nowMs, spec));
    }

    this.#rebuild(rendered);
  }

  #rebuild(puffs: readonly RenderPuff[]): void {
    // Skip empty trails outright: a zero-length thin-instance buffer is never useful.
    if (puffs.length === 0) {
      this.#base.isVisible = false;
      return;
    }

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

  /** Releases the layer-owned base mesh and its material; the scene passed to the constructor is not owned. */
  dispose(): void {
    // Mesh.dispose() defaults to leaving materials alive; the base owns its own matte material.
    this.#base.dispose(false, true);
  }
}
