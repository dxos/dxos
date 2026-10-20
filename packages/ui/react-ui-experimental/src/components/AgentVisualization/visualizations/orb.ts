//
// Copyright 2026 DXOS.org
//

import * as THREE from 'three';

import { number } from '../params.ts';
import { type Visualization } from '../visualization.ts';
import { type GlowConfig, type WaveConfig, glowDefaults, glowParams, waveDefaults, waveParams } from './common.ts';

export type OrbConfig = WaveConfig & GlowConfig & { glow: number; ripple: number };

/** Subdivisions of the icosphere; the GPU displaces every vertex, so a fine mesh costs little. */
const DETAIL = 32;

const VERTEX = /* glsl */ `
  uniform float uPhase;
  uniform float uTime;
  uniform float uLevel;
  uniform float uLow;
  uniform float uHigh;
  uniform float uAmplitude;
  uniform float uJitter;
  uniform float uRipple;
  varying vec3 vPosition;
  varying vec3 vNormal;

  // Displacement as a sum of smooth sinusoids over the sphere: no lattice, so no creases at any scale.
  float displacement(vec3 n) {
    // Passive: a slow breathing swell that fades out as the voice takes over.
    float idle = max(0.0, 1.0 - uLevel * 4.0);
    float breathe = sin(n.x * 1.3 + uPhase * 0.7) * sin(n.y * 1.1 - uPhase * 0.5) * 0.08 * uAmplitude * idle;
    // Speaking: broad lobes from loudness and the low band, on real time so the voice moves it at any passive speed.
    float lobes =
      (sin(n.x * 2.1 + uTime * 1.3) * sin(n.y * 1.7 - uTime * 1.1) +
       sin(n.z * 2.3 + uTime * 0.9) * sin(n.x * 1.3 + uTime * 1.7)) * 0.5 *
      (uLevel * 0.25 + uLow * 0.2);
    // A gentle shimmer from the high band (sibilants), scaled by \`ripple\`; 0 keeps the lobes perfectly smooth.
    float ripple =
      sin(n.x * 6.0 + uTime * 3.0) * sin(n.y * 5.3 - uTime * 2.6) * sin(n.z * 5.7 + uTime * 3.4) *
      uRipple * (uHigh * 0.06 + uJitter * 0.01);
    return breathe + lobes + ripple + uLevel * 0.1;
  }

  vec3 surface(vec3 n) {
    return n * (1.0 + displacement(n));
  }

  void main() {
    vec3 n = normalize(position);
    // The displaced surface's normal from two nearby points on it, so shading is smooth and follows the deformation.
    vec3 tangent = normalize(cross(n, abs(n.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 bitangent = cross(n, tangent);
    vec3 p = surface(n);
    vec3 pa = surface(normalize(n + tangent * 0.01));
    vec3 pb = surface(normalize(n + bitangent * 0.01));
    vec4 world = modelViewMatrix * vec4(p, 1.0);
    vPosition = world.xyz;
    vNormal = normalize(normalMatrix * normalize(cross(pa - p, pb - p)));
    gl_Position = projectionMatrix * world;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uGlow;
  varying vec3 vPosition;
  varying vec3 vNormal;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 view = normalize(-vPosition);
    float light = 0.35 + 0.65 * max(0.0, dot(normal, normalize(vec3(0.4, 0.6, 0.7))));
    float rim = pow(1.0 - max(0.0, dot(normal, view)), 2.0);
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
  params: { ...waveParams, ...glowParams, glow: number(0, 2, 0.05, 'Glow'), ripple: number(0, 1, 0.05, 'Ripple') },
  defaults: { ...waveDefaults, ...glowDefaults, glow: 0.8, ripple: 0.3 },
  presets: {
    calm: { waveAmplitude: 0.6, jitter: 0, waveSpeed: 0.5, glow: 0.5, ripple: 0 },
    lively: { waveAmplitude: 2, jitter: 2, waveSpeed: 2, glow: 1.4, ripple: 0.8 },
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
      uRipple: { value: 0.3 },
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
      update: ({ time, delta, signals }, { waveAmplitude, jitter, waveSpeed, color, speakingColor, glow, ripple }) => {
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
        uniforms.uRipple.value = ripple;
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
