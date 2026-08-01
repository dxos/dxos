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

import { scale } from '../engine';
import { type SimObject } from '../sim';

/** Blast shells, innermost first: each is a fraction of the full radius, its own colour, and its own opacity at the moment of impact. */
const SHELLS = [
  { radius: 0.35, color: new Color3(1, 0.96, 0.75), alpha: 0.95 },
  { radius: 0.65, color: new Color3(1, 0.66, 0.24), alpha: 0.7 },
  { radius: 1, color: new Color3(0.85, 0.31, 0.14), alpha: 0.4 },
];

/** Full blast radius at its widest, as a fraction of the sea radius. */
const BLAST_RADIUS = 0.05;

/** Shells are large and short-lived; a low-poly sphere reads the same and costs less to build. */
const SHELL_SEGMENTS = 10;

/**
 * How the blast expands: fast at first, then easing to its full radius, so it reads as a shock
 * rather than a balloon. `progress` is the rocket's own `state.explosion`.
 */
const expansion = (progress: number): number => Math.sqrt(progress);

/** How it thins out: opaque through the first half, gone by the end. */
const opacity = (progress: number): number => Math.max(0, 1 - progress * progress);

/**
 * Renders the explosion a rocket leaves where it came down: concentric shells that expand and fade
 * together over `state.explosion`, the impact progress the simulation derives from absolute time.
 * Holds nothing between calls, so a caller may skip, repeat, or jump the sim clock as freely as it
 * can with `TrailLayer`.
 */
export class ExplosionLayer {
  readonly #bases: Mesh[];
  readonly #buffers: (Float32Array | undefined)[];

  constructor(options: { scene: Scene }) {
    this.#bases = SHELLS.map(({ color, alpha }, index) => {
      const base = CreateSphere(`explosionShell${index}`, { diameter: 1, segments: SHELL_SEGMENTS }, options.scene);
      base.material = this.#createMaterial(options.scene, index, color, alpha);
      base.isVisible = false;
      // See `object-layer.ts`: the bounding box is only recomputed when the instance count changes,
      // so a stale one would let a close camera cull a blast that is right in front of it.
      base.alwaysSelectAsActiveMesh = true;
      return base;
    });
    this.#buffers = SHELLS.map(() => undefined);
  }

  /** Unlit and alpha-blended, with depth writes off so the shells blend through each other instead of z-fighting. */
  #createMaterial(scene: Scene, index: number, color: Color3, alpha: number): StandardMaterial {
    const material = new StandardMaterial(`explosionShellMat${index}`, scene);
    material.diffuseColor = color;
    material.emissiveColor = color;
    material.specularColor = new Color3(0, 0, 0);
    material.disableLighting = true;
    material.alpha = alpha;
    material.transparencyMode = Material.MATERIAL_ALPHABLEND;
    material.disableDepthWrite = true;
    return material;
  }

  /** Redraws every live blast for this frame's `objects`. */
  update(objects: readonly SimObject[]): void {
    // An explosion runs while `state.explosion` is inside `(0, 1)`; at 1 it has burnt out.
    const blasts = objects.filter(({ state }) => state.explosion > 0 && state.explosion < 1);

    SHELLS.forEach((shell, index) => {
      const base = this.#bases[index];
      if (blasts.length === 0) {
        base.isVisible = false;
        return;
      }

      const needed = blasts.length * 16;
      const reallocate = !this.#buffers[index] || this.#buffers[index]?.length !== needed;
      const buffer = reallocate ? new Float32Array(needed) : this.#buffers[index];
      if (!buffer) {
        return;
      }

      blasts.forEach((blast, instance) => {
        const { state } = blast;
        // Every shell of one blast shares its centre and its progress; only the radius differs.
        const size = state.radius * BLAST_RADIUS * shell.radius * expansion(state.explosion);
        const position = scale(state.unit, state.radius);
        Matrix.Compose(
          new Vector3(size, size, size),
          Quaternion.Identity(),
          new Vector3(position[0], position[1], position[2]),
        ).copyToArray(buffer, instance * 16);
      });

      if (reallocate) {
        // `staticBuffer: false` — see `TrailLayer`: a static buffer ignores every later update.
        base.thinInstanceSetBuffer('matrix', buffer, 16, false);
        this.#buffers[index] = buffer;
      } else {
        base.thinInstanceBufferUpdated('matrix');
      }

      // All the blasts on screen share one fade, which is only wrong while two overlap in time —
      // rare, and invisible against a blast that is already translucent.
      const material = base.material;
      if (material) {
        material.alpha = shell.alpha * opacity(Math.min(...blasts.map(({ state }) => state.explosion)));
      }
      base.isVisible = true;
    });
  }

  /** Releases the layer-owned shell meshes and their materials; the scene passed to the constructor is not owned. */
  dispose(): void {
    this.#bases.forEach((base) => base.dispose(false, true));
  }
}
