//
// Copyright 2024 DXOS.org
//

import * as THREE from 'three';

// @ts-ignore
import dofFrag from './glsl/dof.frag';
// @ts-ignore
import dofVert from './glsl/dof.vert';
// @ts-ignore
import simFrag from './glsl/sim.frag';
// @ts-ignore
import simVert from './glsl/sim.vert';

// TODO(burdon): Compile shader using gl element.
// const shader = gl.createShader(type)!;
// gl.shaderSource(shader, source);
// gl.compileShader(shader);

export type ShaderOptions = {
  size: number;
  fov: number;
  zoom: number;
  focus: number;
  aperture: number;
  speed: number;
  curl: number;
  chaos: number;
  color: [number, number, number];
};

/**
 * Depth of field.
 * https://threejs.org/docs/#api/en/materials/ShaderMaterial
 */
export class DofPointsMaterial extends THREE.ShaderMaterial {
  constructor({ focus, color, fov }: ShaderOptions) {
    super({
      fragmentShader: dofFrag,
      vertexShader: dofVert,
      vertexColors: true,
      uniforms: {
        positions: { value: null },
        uTime: { value: 0 },
        uBlur: { value: 1 },
        uFocus: { value: focus },
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
  constructor({ curl, chaos }: ShaderOptions) {
    const positionsTexture = new THREE.DataTexture(getSphere(n * n, r), n, n, THREE.RGBAFormat, THREE.FloatType);
    positionsTexture.needsUpdate = true;
    super({
      fragmentShader: simFrag,
      vertexShader: simVert,
      uniforms: {
        positions: { value: positionsTexture },
        uTime: { value: 0 },
        uCurl: { value: curl },
        uChaos: { value: chaos },
        uPerturbation: { value: 1.0 },
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
