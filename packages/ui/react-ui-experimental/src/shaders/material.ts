//
// Copyright 2024 DXOS.org
//

import * as THREE from 'three';
//
// Pragma error when attempting to use glslify-vite-plugin so the shader files are compiled here via the npm script.
// The ?raw suffix prevent vite from importing these as TypeScript files.
//

import dofFrag from './glsl/gen/dof.frag?raw';
import dofVert from './glsl/gen/dof.vert?raw';
import simFrag from './glsl/gen/sim.frag?raw';
import simVert from './glsl/gen/sim.vert?raw';

/**
 * Points sized and faded by their distance from a focal plane, read from the simulation's position texture.
 * https://threejs.org/docs/#api/en/materials/ShaderMaterial
 */
export class DofPointsMaterial extends THREE.ShaderMaterial {
  constructor({ focus, fov }: { focus: number; fov: number }) {
    super({
      fragmentShader: dofFrag,
      vertexShader: dofVert,
      vertexColors: true,
      uniforms: {
        positions: { value: null },
        uTime: { value: 0 },
        uBlur: { value: 0 },
        uFocus: { value: focus },
        uFov: { value: fov },
        uColor: { value: new THREE.Color() },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }
}

/** Side of the seed texture of points on a sphere. */
const SEED_SIZE = 512;
const SEED_RADIUS = 128;

/** Curl-noise flow: writes each particle's position, as a function of its seed point and time, into a texture. */
export class SimulationMaterial extends THREE.ShaderMaterial {
  readonly #seed: THREE.DataTexture;

  constructor({ curl, chaos, alpha }: { curl: number; chaos: number; alpha: number }) {
    const seed = new THREE.DataTexture(
      getSphere(SEED_SIZE * SEED_SIZE, SEED_RADIUS),
      SEED_SIZE,
      SEED_SIZE,
      THREE.RGBAFormat,
      THREE.FloatType,
    );
    seed.needsUpdate = true;
    super({
      fragmentShader: simFrag,
      vertexShader: simVert,
      uniforms: {
        positions: { value: seed },
        uTime: { value: 0 },
        uCurl: { value: curl },
        uCurls: { value: [2.0, 4.0, 8.0, 16.0, 32.0] },
        uChaos: { value: chaos },
        uAlpha: { value: alpha },
        uPerturbation: { value: 0.0 },
      },
    });
    this.#seed = seed;
  }

  override dispose(): void {
    this.#seed.dispose();
    super.dispose();
  }
}

/** Random points on the surface of a sphere, as RGBA texels. */
const getSphere = (count: number, radius: number) => {
  const data = new Float32Array(count * 4);
  const point = new THREE.Vector4();
  for (let offset = 0; offset < count * 4; offset += 4) {
    // Rejection sampling: a uniform point in the cube, kept only inside the unit ball, is uniform on the sphere once
    // normalized.
    do {
      point.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1, 0);
    } while (point.length() > 1 || point.length() === 0);
    point.normalize().multiplyScalar(radius).toArray(data, offset);
  }

  return data;
};
