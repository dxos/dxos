//
// Copyright 2026 DXOS.org
//

import * as THREE from 'three';

import { DofPointsMaterial, type ShaderOptions, SimulationMaterial } from '../../../shaders/index.ts';
import { color, number } from '../params.ts';
import { type Visualization } from '../visualization.ts';

export type ChaosConfig = {
  /** Pace of the curl-noise flow. */
  speed: number;
  /** Diffusion of the cloud; low values hold a smooth shell. */
  curl: number;
  /** Octaves of curl noise layered over the flow. */
  chaos: number;
  /** Spread of the chaotic positions. */
  alpha: number;
  /** How strongly the voice pulls the cloud into order. */
  gain: number;
  fov: number;
  zoom: number;
  /** Focal plane offset; points away from it blur into larger discs. */
  focus: number;
  /** Lower is blurrier, as on a camera lens (max 5.6). */
  aperture: number;
  color: string;
};

/** Points per side of the simulation texture; the cloud has its square. */
const SIZE = 512;
const DISTANCE = 2;

/** Per-second rates at which the voice's pull on the cloud rises and falls. */
const ATTACK = 6;
const RELEASE = 0.8;

/**
 * A particle cloud flowing through curl noise, simulated on the GPU into a texture each frame. Silent, it drifts
 * through its chaos; speaking, the voice pulls it toward a calmer, ordered shell and quickens its flow.
 */
export const chaos: Visualization<ChaosConfig> = {
  id: 'chaos',
  title: 'Chaos',
  params: {
    speed: number(0, 100, 1, 'Speed'),
    curl: number(0.01, 5, 0.01, 'Curl'),
    chaos: number(0, 4, 1, 'Chaos'),
    alpha: number(0, 1, 0.01, 'Alpha'),
    gain: number(0, 2, 0.05, 'Gain'),
    fov: number(30, 150, 1, 'Field of view'),
    zoom: number(0.1, 5, 0.1, 'Zoom'),
    focus: number(-1, 1, 0.01, 'Focus'),
    aperture: number(0, 5.6, 0.1, 'Aperture'),
    color: color('Colour'),
  },
  defaults: {
    speed: 24,
    curl: 0.7,
    chaos: 1,
    alpha: 0.53,
    gain: 0.9,
    fov: 50,
    zoom: 0.8,
    focus: 0.05,
    aperture: 5.6,
    color: '#003399',
  },
  presets: {
    heptapod: { speed: 24, curl: 0.7, chaos: 1, alpha: 0.53, fov: 50, zoom: 0.8, focus: 0.05 },
    spore: { speed: 24, curl: 1, chaos: 1, alpha: 0.53, fov: 50, zoom: 0.8, focus: 0.3 },
    portal: { speed: 30, curl: 0.01, chaos: 1, alpha: 0.4, fov: 64, zoom: 1.1, focus: 0 },
    droplet: { speed: 15, curl: 0.01, chaos: 4, alpha: 0.1, fov: 82, zoom: 2.7, focus: 0.18 },
  },
  create: ({ scene, camera, renderer }) => {
    const { defaults } = chaos;
    const options: ShaderOptions = {
      ...defaults,
      distance: DISTANCE,
      rotation: 0,
      size: SIZE,
      color: [0, 0.2, 0.6],
    };

    // The simulation: a full-screen quad whose fragment shader writes each particle's position into a texture.
    const target = new THREE.WebGLRenderTarget(SIZE, SIZE, {
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
    const simulation = new SimulationMaterial(options);
    simScene.add(new THREE.Mesh(quad, simulation));

    // The cloud: one point per texel, positioned in the vertex shader from the simulation's output.
    const lookup = new Float32Array(SIZE * SIZE * 3);
    for (let index = 0; index < SIZE * SIZE; index++) {
      lookup[index * 3] = (index % SIZE) / SIZE;
      lookup[index * 3 + 1] = Math.floor(index / SIZE) / SIZE;
    }
    const cloud = new THREE.BufferGeometry();
    cloud.setAttribute('position', new THREE.BufferAttribute(lookup, 3));
    const points = new DofPointsMaterial(options);
    points.uniforms.positions.value = target.texture;
    const tint = new THREE.Color();
    points.uniforms.uColor.value = tint;
    scene.add(new THREE.Points(cloud, points));

    camera.position.set(0, 0, DISTANCE);
    let phase = 0;
    let pull = 0;
    return {
      update: ({ delta, signals }, config) => {
        const { level } = signals.voice;
        // Fast to answer the voice, slow to let go, so the cloud settles between words rather than flickering.
        const rate = level * config.gain > pull ? ATTACK : RELEASE;
        pull += (level * config.gain - pull) * Math.min(1, delta * rate);

        // Accumulated, so changing speed changes pace without jumping the flow.
        phase += delta * config.speed * (1 + pull);
        simulation.uniforms.uTime.value = phase;
        simulation.uniforms.uCurl.value = config.curl * (1 - Math.min(0.5, pull * 0.6));
        simulation.uniforms.uChaos.value = config.chaos;
        simulation.uniforms.uAlpha.value = config.alpha;
        simulation.uniforms.uPerturbation.value = pull * 0.8;
        renderer.setRenderTarget(target);
        renderer.render(simScene, simCamera);
        renderer.setRenderTarget(null);

        const ease = Math.min(1, delta * 6);
        points.uniforms.uFocus.value += (DISTANCE + config.focus - points.uniforms.uFocus.value) * ease;
        points.uniforms.uBlur.value += ((5.6 - config.aperture) * 9 - points.uniforms.uBlur.value) * ease;
        points.uniforms.uFov.value = config.fov;
        // The shader writes the colour as given, so it is read as linear rather than converted from sRGB.
        tint.setStyle(config.color, THREE.LinearSRGBColorSpace);

        if (camera.fov !== config.fov || camera.zoom !== config.zoom) {
          camera.fov = config.fov;
          camera.zoom = config.zoom;
          camera.updateProjectionMatrix();
        }
      },
      dispose: () => {
        target.dispose();
        quad.dispose();
        cloud.dispose();
        simulation.uniforms.positions.value.dispose();
        simulation.dispose();
        points.dispose();
      },
    };
  },
};
