//
// Copyright 2026 DXOS.org
//

import * as THREE from 'three';

import { color, number } from '../params.ts';
import { type Visualization } from '../visualization.ts';

export type RippleConfig = {
  /** Height of the waves. */
  amplitude: number;
  /** Wave crests between the source and the horizon. */
  rings: number;
  /** How fast the sound travels out from the source, in radians of arc per second. */
  speed: number;
  /** Jagged peaks over the waves; 0 keeps them smooth. */
  spikes: number;
  /** How sharply the waves fade with distance from the source; 0 carries them to the horizon. */
  focus: number;
  /** How quickly each wave dies out as it ages, per second (1-10). */
  decay: number;
  low: string;
  high: string;
  peak: string;
};

/** Loudness samples kept, one per `SAMPLE` seconds: how far back in time the outermost ring reaches. */
const HISTORY = 128;
const SAMPLE = 1 / 60;
const RADIUS = 2;
const STARS = 400;
/** Width of the grid before it is laid over the sphere, and its cells per side. */
const CAP = 8;
/** Arc from the pole, in radians, that the grid's half-width covers. */
const MAX_ARC = 1.5;
const GRID = 120;

const VERTEX = /* glsl */ `
  uniform float uHistory[${HISTORY}];
  uniform float uTime;
  uniform float uAmplitude;
  uniform float uRings;
  uniform float uSpeed;
  uniform float uSpikes;
  uniform float uFocus;
  uniform float uDecay;
  varying float vHeight;

  float hash(vec3 point) {
    return fract(sin(dot(point, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  }

  // The loudness when the wave now at this distance left the source, interpolated between samples.
  float history(float delay) {
    float index = clamp(delay / ${SAMPLE.toFixed(6)}, 0.0, ${(HISTORY - 1).toFixed(1)});
    int lower = int(floor(index));
    int upper = min(lower + 1, ${HISTORY - 1});
    return mix(uHistory[lower], uHistory[upper], fract(index));
  }

  void main() {
    // A flat square grid laid over the sphere with distance from its centre kept as arc length from the pole (where
    // the source is), so cells stay even from the source out to the horizon.
    float radial = length(position.xz);
    float arc = radial * ${(MAX_ARC / (CAP / 2)).toFixed(6)};
    vec2 heading = radial > 0.0 ? position.xz / radial : vec2(0.0);
    vec3 normal = vec3(heading.x * sin(arc), cos(arc), heading.y * sin(arc));
    float delay = arc / uSpeed;
    float level = history(delay) * exp(-delay * uDecay);
    float crest = 0.5 + 0.5 * sin(arc * uRings - uTime * uSpeed * uRings);
    // Each vertex flickers on its own phase, so loud rings bristle into peaks.
    float seed = hash(position);
    float spike = seed * (0.5 + 0.5 * sin(uTime * 9.0 + seed * 6.2832)) * uSpikes;
    float idle = 0.012 * (0.5 + 0.5 * sin(arc * uRings * 0.5 - uTime * 1.5));
    // Spikes ride the crests, so the rings stay legible as rings.
    float height = idle + level * uAmplitude * crest * (0.25 + spike * 0.6) * exp(-arc * uFocus);
    vHeight = height;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(normal * (${RADIUS.toFixed(1)} + height), 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uLow;
  uniform vec3 uHigh;
  uniform vec3 uPeak;
  varying float vHeight;

  void main() {
    float level = clamp(vHeight / 0.35, 0.0, 1.0);
    vec3 colour = mix(uLow, uHigh, smoothstep(0.0, 0.6, level));
    colour = mix(colour, uPeak, smoothstep(0.6, 1.0, level));
    gl_FragColor = vec4(colour, 1.0);
  }
`;

const FILL = /* glsl */ `
  uniform vec3 uBackground;

  void main() {
    gl_FragColor = vec4(uBackground, 1.0);
  }
`;

/**
 * A wireframe planet seen from just above its surface. The voice sounds at the pole nearest the viewer, and its
 * loudness travels outward as concentric rings that rise into jagged peaks and glow from violet to cyan to yellow.
 */
export const ripple: Visualization<RippleConfig> = {
  id: 'ripple',
  title: 'Ripple',
  params: {
    amplitude: number(0, 3, 0.05, 'Amplitude'),
    rings: number(4, 60, 1, 'Rings'),
    speed: number(0.2, 4, 0.05, 'Speed'),
    spikes: number(0, 2, 0.05, 'Spikes'),
    focus: number(0, 6, 0.1, 'Focus'),
    decay: number(1, 10, 0.1, 'Decay'),
    low: color('Low'),
    high: color('High'),
    peak: color('Peak'),
  },
  defaults: {
    amplitude: 1,
    rings: 24,
    speed: 1.2,
    spikes: 1,
    focus: 2.5,
    decay: 1,
    low: '#5b3cff',
    high: '#2ee6d6',
    peak: '#f5f542',
  },
  presets: {
    calm: { amplitude: 0.6, rings: 12, speed: 0.8, spikes: 0, focus: 1.5, decay: 1 },
    storm: { amplitude: 2, rings: 40, speed: 2, spikes: 1.8, focus: 1, decay: 1 },
  },
  create: ({ scene, camera }) => {
    const history = new Array<number>(HISTORY).fill(0);
    const uniforms = {
      uHistory: { value: history },
      uTime: { value: 0 },
      uAmplitude: { value: 1 },
      uRings: { value: 24 },
      uSpeed: { value: 1 },
      uSpikes: { value: 1 },
      uFocus: { value: 2.5 },
      uDecay: { value: 1 },
      uBackground: { value: new THREE.Color() },
      uLow: { value: new THREE.Color() },
      uHigh: { value: new THREE.Color() },
      uPeak: { value: new THREE.Color() },
    };
    const geometry = new THREE.PlaneGeometry(CAP, CAP, GRID, GRID).rotateX(-Math.PI / 2);
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms,
      wireframe: true,
    });
    const planet = new THREE.Mesh(geometry, material);
    // Hidden-line removal: the same displaced surface drawn solid in the background colour, pushed back a little in
    // depth, so it hides the far side's lines without hiding the lines lying on it.
    const fill = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FILL,
      uniforms,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const solid = new THREE.Mesh(geometry, fill);
    if (scene.background instanceof THREE.Color) {
      uniforms.uBackground.value.copy(scene.background);
    }
    scene.add(solid, planet);

    const starPositions = new Float32Array(STARS * 3);
    const star = new THREE.Vector3();
    for (let index = 0; index < STARS; index++) {
      star.randomDirection().multiplyScalar(30 + Math.random() * 20);
      star.toArray(starPositions, index * 3);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Above and in front of the pole, looking down at it with the horizon curving across the top of the frame.
    camera.position.set(0, RADIUS + 1.5, 1.7);
    camera.lookAt(0, RADIUS, -0.15);

    let time = 0;
    let pending = 0;
    let smoothed = 0;
    return {
      update: ({ delta, signals }, { amplitude, rings, speed, spikes, focus, decay, low, high, peak }) => {
        time += delta;
        smoothed += (signals.voice.level - smoothed) * Math.min(1, delta * 20);
        // Fixed-rate samples, so a ring's distance from the source maps to the same delay at any frame rate.
        pending += delta;
        while (pending >= SAMPLE) {
          pending -= SAMPLE;
          history.pop();
          history.unshift(smoothed);
        }
        uniforms.uTime.value = time;
        uniforms.uAmplitude.value = amplitude;
        uniforms.uRings.value = rings;
        uniforms.uSpeed.value = speed;
        uniforms.uSpikes.value = spikes;
        uniforms.uFocus.value = focus;
        uniforms.uDecay.value = decay;
        // The shader writes the colours as given, so they are read as linear rather than converted from sRGB.
        uniforms.uLow.value.setStyle(low, THREE.LinearSRGBColorSpace);
        uniforms.uHigh.value.setStyle(high, THREE.LinearSRGBColorSpace);
        uniforms.uPeak.value.setStyle(peak, THREE.LinearSRGBColorSpace);
        stars.rotation.y += delta * 0.01;
      },
      dispose: () => {
        scene.remove(solid, planet, stars);
        geometry.dispose();
        material.dispose();
        fill.dispose();
        starGeometry.dispose();
        starMaterial.dispose();
      },
    };
  },
};
