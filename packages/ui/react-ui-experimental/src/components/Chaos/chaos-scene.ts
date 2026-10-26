//
// Copyright 2026 DXOS.org
//

import * as THREE from 'three';

import { DofPointsMaterial, SimulationMaterial } from '../../shaders/index.ts';
import { type SceneContext } from '../../three/index.ts';

export type ChaosOptions = {
  /** Pace of the curl-noise flow. */
  speed: number;
  /** Diffusion of the cloud; low values hold a smooth shell. */
  curl: number;
  /** Octaves of curl noise layered over the flow (0-4). */
  chaos: number;
  /** Spread of the chaotic positions. */
  alpha: number;
  /** How strongly the input value pulls the cloud into order. */
  gain: number;
  fov: number;
  zoom: number;
  /** Camera distance from the cloud. */
  distance: number;
  /** Focal plane offset; points away from it blur into larger discs. */
  focus: number;
  /** Lower is blurrier, as on a camera lens (max 5.6). */
  aperture: number;
  /** Turn rate of the cloud. */
  rotation: number;
  color: string;
};

export type ChaosScene = {
  /** `value` is the input level (e.g. a voice's loudness), 0 to about 1. */
  update(delta: number, value: number, options: ChaosOptions): void;
  dispose(): void;
};

/** Per-second rates at which the input's pull on the cloud rises and falls. */
const ATTACK = 6;
const RELEASE = 0.8;

/**
 * A particle cloud flowing through curl noise, simulated on the GPU into a `size`×`size` texture each frame. With no
 * input it drifts through its chaos; the input pulls it toward a calmer shell and quickens its flow.
 */
export const createChaosScene = ({ scene, camera, renderer }: SceneContext, size = 512): ChaosScene => {
  const target = new THREE.WebGLRenderTarget(size, size, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    type: THREE.HalfFloatType,
  });
  const simScene = new THREE.Scene();
  const simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.BufferGeometry();
  quad.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0]), 3),
  );
  quad.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0]), 2));
  const simulation = new SimulationMaterial({ curl: 1, chaos: 1, alpha: 1 });
  simScene.add(new THREE.Mesh(quad, simulation));

  // One point per texel; its position attribute is the texel to read, not a place.
  const lookup = new Float32Array(size * size * 3);
  for (let index = 0; index < size * size; index++) {
    lookup[index * 3] = (index % size) / size;
    lookup[index * 3 + 1] = Math.floor(index / size) / size;
  }
  const cloud = new THREE.BufferGeometry();
  cloud.setAttribute('position', new THREE.BufferAttribute(lookup, 3));
  const points = new DofPointsMaterial({ focus: 2, fov: 50 });
  points.uniforms.positions.value = target.texture;
  const tint = new THREE.Color();
  points.uniforms.uColor.value = tint;
  const mesh = new THREE.Points(cloud, points);
  // The vertex shader moves every point, so the lookup grid's bounds say nothing about where the cloud is.
  mesh.frustumCulled = false;
  scene.add(mesh);

  let phase = 0;
  let pull = 0;
  return {
    update: (delta, value, options) => {
      // Fast to answer the input, slow to let go, so the cloud settles between words rather than flickering.
      const drive = value * options.gain;
      pull += (drive - pull) * Math.min(1, delta * (drive > pull ? ATTACK : RELEASE));

      // Accumulated, so changing speed changes pace without jumping the flow.
      phase += delta * options.speed * (1 + pull);
      simulation.uniforms.uTime.value = phase;
      simulation.uniforms.uCurl.value = options.curl * (1 - Math.min(0.5, pull * 0.6));
      simulation.uniforms.uChaos.value = Math.round(options.chaos);
      simulation.uniforms.uAlpha.value = options.alpha;
      simulation.uniforms.uPerturbation.value = pull * 0.8;
      renderer.setRenderTarget(target);
      renderer.render(simScene, simCamera);
      renderer.setRenderTarget(null);

      const ease = Math.min(1, delta * 6);
      points.uniforms.uFocus.value += (options.distance + options.focus - points.uniforms.uFocus.value) * ease;
      points.uniforms.uBlur.value += ((5.6 - options.aperture) * 9 - points.uniforms.uBlur.value) * ease;
      points.uniforms.uFov.value = options.fov;
      // The shader writes the colour as given, so it is read as linear rather than converted from sRGB.
      tint.setStyle(options.color, THREE.LinearSRGBColorSpace);
      mesh.rotation.y += delta * options.rotation * 0.1;

      camera.position.z = options.distance;
      if (camera.fov !== options.fov || camera.zoom !== options.zoom) {
        camera.fov = options.fov;
        camera.zoom = options.zoom;
        camera.updateProjectionMatrix();
      }
    },
    dispose: () => {
      scene.remove(mesh);
      target.dispose();
      quad.dispose();
      cloud.dispose();
      simulation.dispose();
      points.dispose();
    },
  };
};
