//
// Copyright 2026 DXOS.org
//

import * as THREE from 'three';

import { number } from '../params.ts';
import { type Visualization } from '../visualization.ts';
import { type GlowConfig, type WaveConfig, glowDefaults, glowParams, waveDefaults, waveParams } from './common.ts';

export type OrbConfig = WaveConfig & GlowConfig & { glow: number };

/** Subdivisions of the icosphere; the GPU displaces every vertex, so a fine mesh costs little. */
const DETAIL = 48;

const VERTEX = /* glsl */ `
  uniform float uPhase;
  uniform float uTime;
  uniform float uLevel;
  uniform float uLow;
  uniform float uHigh;
  uniform float uAmplitude;
  uniform float uJitter;
  varying vec3 vPosition;
  varying vec3 vNormal;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  // Value noise, smoothly interpolated between hashed lattice points.
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z
    );
  }

  void main() {
    vec3 n = normalize(position);
    // Passive: a slow breathing swell. Speaking: broad lobes from the low band and loudness, fine ripples from the
    // high band (sibilants), both on real time so the voice moves it whatever the passive speed.
    float idle = max(0.0, 1.0 - uLevel * 4.0);
    float breathe = (noise(n * 1.6 + uPhase * 0.35) - 0.5) * 0.12 * uAmplitude * idle;
    float lobes = (noise(n * 2.2 + uTime * 1.3) - 0.5) * (uLevel * 0.45 + uLow * 0.35);
    float ripple = (noise(n * 9.0 + uTime * 4.0) - 0.5) * (uHigh * 0.25 + uJitter * 0.02);
    vec3 displaced = n * (1.0 + breathe + lobes + ripple + uLevel * 0.12);
    vec4 world = modelViewMatrix * vec4(displaced, 1.0);
    vPosition = world.xyz;
    vNormal = normalize(normalMatrix * n);
    gl_Position = projectionMatrix * world;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uGlow;
  varying vec3 vPosition;
  varying vec3 vNormal;

  void main() {
    // The displaced surface's own normal, from screen-space derivatives, so lighting follows the deformation.
    vec3 normal = normalize(cross(dFdx(vPosition), dFdy(vPosition)));
    vec3 view = normalize(-vPosition);
    float light = 0.35 + 0.65 * max(0.0, dot(normal, normalize(vec3(0.4, 0.6, 0.7))));
    float rim = pow(1.0 - max(0.0, dot(normalize(vNormal), view)), 2.0);
    gl_FragColor = vec4(uColor * light + uColor * rim * uGlow, 1.0);
  }
`;

/**
 * A voice orb: an icosphere displaced on the GPU. Passive, it breathes slowly; speaking, it swells in broad lobes with
 * the voice's loudness and low band and ripples finely with its high band, glowing toward the speaking colour.
 */
export const orb: Visualization<OrbConfig> = {
  id: 'orb',
  title: 'Orb',
  params: { ...waveParams, ...glowParams, glow: number(0, 2, 0.05, 'Glow') },
  defaults: { ...waveDefaults, ...glowDefaults, glow: 0.8 },
  presets: {
    calm: { waveAmplitude: 0.6, jitter: 0, waveSpeed: 0.5, glow: 0.5 },
    lively: { waveAmplitude: 2, jitter: 2, waveSpeed: 2, glow: 1.4 },
  },
  create: ({ scene }) => {
    const geometry = new THREE.IcosahedronGeometry(1, DETAIL);
    const uniforms = {
      uPhase: { value: 0 },
      uTime: { value: 0 },
      uLevel: { value: 0 },
      uLow: { value: 0 },
      uHigh: { value: 0 },
      uAmplitude: { value: 1 },
      uJitter: { value: 0 },
      uColor: { value: new THREE.Color() },
      uGlow: { value: 0.8 },
    };
    const material = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    const silent = new THREE.Color();
    const loud = new THREE.Color();

    let phase = 0;
    return {
      update: ({ time, delta, signals }, { waveAmplitude, jitter, waveSpeed, color, speakingColor, glow }) => {
        const { level, low, high } = signals.voice;
        // Accumulated, so speed 0 freezes the passive motion.
        phase += delta * waveSpeed;
        uniforms.uPhase.value = phase;
        uniforms.uTime.value = time;
        uniforms.uLevel.value = level;
        uniforms.uLow.value = low;
        uniforms.uHigh.value = high;
        uniforms.uAmplitude.value = waveAmplitude;
        uniforms.uJitter.value = jitter;
        uniforms.uGlow.value = glow;
        silent.set(color);
        loud.set(speakingColor);
        uniforms.uColor.value.copy(silent).lerp(loud, Math.min(1, level * 1.6));
        mesh.rotation.y += delta * 0.1 * waveSpeed;
      },
      dispose: () => {
        geometry.dispose();
        material.dispose();
      },
    };
  },
};
