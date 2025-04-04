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

export type ShaderOptions = {
  // Camera.
  fov: number;
  /** Max 5.6 (sharper). */
  aperture: number;
  zoom: number;
  distance: number;
  focus: number;
  rotation: number;

  // Object.
  size: number;
  speed: number;
  /** Higher values are more diffuse. */
  curl: number;
  chaos: number;
  alpha: number;
  gain: number;
  color: [number, number, number];
};

/**
 * Depth of field.
 * https://threejs.org/docs/#api/en/materials/ShaderMaterial
 */
export class DofPointsMaterial extends THREE.ShaderMaterial {
  constructor({ distance, focus, color, fov }: ShaderOptions) {
    super({
      fragmentShader: dofFrag,
      vertexShader: dofVert,
      vertexColors: true,
      uniforms: {
        positions: { value: null },
        uTime: { value: 0 },
        uBlur: { value: 0 },
        uFocus: { value: distance + focus },
        uFov: { value: fov },
        uColor: { value: color },
      },
      transparent: true,
      // blending: THREE.NormalBlending,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }
}

const n = 512;
const r = 128;

export class SimulationMaterial extends THREE.ShaderMaterial {
  constructor({ curl, chaos, alpha }: ShaderOptions) {
    const positionsTexture = new THREE.DataTexture(getSphere(n * n, r), n, n, THREE.RGBAFormat, THREE.FloatType);
    positionsTexture.needsUpdate = true;
    super({
      fragmentShader: simFrag,
      vertexShader: simVert,
      uniforms: {
        positions: { value: positionsTexture },
        uTime: { value: 0 },
        uCurl: { value: curl },
        uCurls: { value: [2.0, 4.0, 8.0, 16.0, 32.0] },
        // uCurls: { value: [32.0, 16.0, 8.0, 4.0, 2.0] },
        uChaos: { value: chaos },
        uAlpha: { value: alpha },
        uPerturbation: { value: 0.0 },
      },
    });
  }
}

/**
 * Generates a random points on the surface a sphere.
 */
const getSphere = (count: number, radius: number, p = new THREE.Vector4()) => {
  const data = new Float32Array(count * 4);
  for (let i = 0; i < count * 4; i += 4) {
    getPoint(p, radius, data, i);
  }

  return data;
};

/**
 * Generates a random point on the surface a sphere and writes it to the data array at offset.
 */
const getPoint = (p: THREE.Vector4, radius: number, data: Float32Array, offset: number): any => {
  // Generate random point in cube, recursively try again if outside unit sphere
  p.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1, 0);
  if (p.length() > 1) {
    return getPoint(p, radius, data, offset);
  }

  // Scale point to sphere surface and write to array.
  return p.normalize().multiplyScalar(radius).toArray(data, offset);
};
