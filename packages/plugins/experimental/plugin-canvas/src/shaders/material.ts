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

export type Options = {
  size: number;
  focus: number;
  speed: number;
  aperture: number;
  curl: number;
  chaos: number;
  tint: [number, number, number];

  fov: number;
  zoom: number;
};

/**
 * Depth of field.
 * https://threejs.org/docs/#api/en/materials/PointsMaterial
 */
export class DofPointsMaterial extends THREE.ShaderMaterial {
  constructor({ focus, tint, fov }: Options) {
    super({
      fragmentShader: dofFrag,
      vertexShader: dofVert,
      uniforms: {
        positions: { value: null },
        uTime: { value: 0 },
        uFocus: { value: focus },
        uFov: { value: fov },
        uBlur: { value: 5 },
        uMask: { value: tint },
      },
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
  }
}

export class SimulationMaterial extends THREE.ShaderMaterial {
  constructor({ chaos, curl }: Options) {
    const positionsTexture = new THREE.DataTexture(
      getSphere(512 * 512, 128),
      512,
      512,
      THREE.RGBAFormat,
      THREE.FloatType,
    );
    positionsTexture.needsUpdate = true;
    super({
      fragmentShader: simFrag,
      vertexShader: simVert,
      uniforms: {
        positions: { value: positionsTexture },
        uTime: { value: 0 },
        uCurlFreq: { value: curl },
        uChaos: { value: chaos },
        uPerturbation: { value: 1.0 },
      },
    });
  }
}

const getSphere = (count: number, size: number, p = new THREE.Vector4()) => {
  const data = new Float32Array(count * 4);
  for (let i = 0; i < count * 4; i += 4) {
    getPoint(p, size, data, i);
  }

  return data;
};

const getPoint = (v: any, size: number, data: Float32Array, offset: number): any => {
  v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  if (v.length() > 1) {
    return getPoint(v, size, data, offset);
  }

  return v.normalize().multiplyScalar(size).toArray(data, offset);
};
