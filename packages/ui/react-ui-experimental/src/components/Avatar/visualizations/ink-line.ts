//
// Copyright 2026 DXOS.org
//

import * as THREE from 'three';

import { number } from '../params.ts';
import { BANDS } from '../signals.ts';
import { type Visualization, type VisualizationInstance } from '../visualization.ts';
import { INK_BLOTS, type InkConfig, MAX_STRANDS, idleness, inkDefaults, inkParams, inkPresets } from './common.ts';

/** Samples along the stroke. */
const SAMPLES = 320;
const HALF_WIDTH = 2.4;
/** The morph's ring radius, matching the ink ring's, and its height when flattened, as a share of it. */
const MORPH_RADIUS = 1.05;
const MORPH_FLAT = 0.04;
/** Seconds to open toward the voice's loudness and to flatten back: near instant, so the ring tracks the voice. */
const MORPH_IN = 0.04;
const MORPH_OUT = 0.08;

export type InkMorphConfig = InkConfig & {
  /** Loudness that opens the ring fully is `1 / gain`. */
  gain: number;
};

/**
 * The ink as a horizontal stroke, frequency running linearly from left (low) to right (high). Where a frequency
 * sounds the stroke thickens and vibrates in place (faster toward the high end) and sheds blots that drift away;
 * passive, it is a thin brush line that wobbles in an irregular wave. Strands stack `separation` apart, the middle one
 * thickest; the stroke tapers to a point at both ends.
 */
export const inkLine: Visualization<InkConfig> = {
  id: 'ink-line',
  title: 'Ink line',
  params: inkParams,
  defaults: inkDefaults,
  presets: inkPresets,
  create: ({ scene }) => createStroke(scene, false),
};

/**
 * The ink stroke as a closed ring of fixed width: flattened in silence, its height following the voice's loudness up
 * to a circle. Its spectrum rises from the bottom point (lowest) up both sides to the top point (highest), so it has no
 * seam.
 */
export const inkMorph: Visualization<InkMorphConfig> = {
  id: 'ink-morph',
  title: 'Ink morph',
  params: { ...inkParams, gain: number(0.5, 6, 0.1, 'Gain') },
  defaults: { ...inkDefaults, gain: 3 },
  presets: inkPresets,
  create: ({ scene }) => createStroke(scene, true),
};

/** Shared by the line and the morph; only the morph reads `gain`, which the line's config lacks. */
const createStroke = (scene: THREE.Scene, morph: boolean): VisualizationInstance<InkMorphConfig> => {
  const paper = new THREE.Color();
  scene.background = paper;
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const group = new THREE.Group();
  scene.add(group);

  // Each strand is a strip of quads, one edge either side of the curve per sample, rewritten every frame.
  const indices: number[] = [];
  for (let segment = 0; segment < SAMPLES; segment++) {
    const top = segment * 2;
    indices.push(top, top + 1, top + 2, top + 1, top + 3, top + 2);
  }
  const strands = Array.from({ length: MAX_STRANDS }, (_, index) => {
    const positions = new Float32Array((SAMPLES + 1) * 2 * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = index === 0;
    group.add(mesh);
    return { positions, geometry, mesh, phase: index * 1.9 };
  });

  const blotGeometry = new THREE.CircleGeometry(1, 24);
  const blots = Array.from({ length: INK_BLOTS }, () => {
    const blotMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(blotGeometry, blotMaterial);
    mesh.visible = false;
    group.add(mesh);
    return { mesh, material: blotMaterial, x: 0, y: 0, dx: 0, dy: 1, size: 0, age: 0, life: 0 };
  });

  /** Energy at `position` (0..1 along the spectrum), interpolated between the linear points. */
  const energyAt = (linear: number[], position: number) => {
    const point = position * (linear.length - 1);
    const below = Math.floor(point);
    const above = Math.min(linear.length - 1, below + 1);
    return linear[below] + (linear[above] - linear[below]) * (point - below);
  };

  /** How open the morph's ring is, from 0 (flattened) to 1 (a circle), in proportion to loudness. */
  let open = 0;
  /**
   * The stroke at `position` (0..1 along it): its point, unit normal, and where it sits in the spectrum (0..1). The
   * line runs straight, left to right; the morph's ring runs from its left point over the top and back underneath, its
   * height following `open`, with the spectrum rising from its bottom point to its top point.
   */
  const curve = (position: number) => {
    if (!morph) {
      return { x: (position - 0.5) * 2 * HALF_WIDTH, y: 0, nx: 0, ny: 1, spectrum: position };
    }
    const height = MORPH_RADIUS * (MORPH_FLAT + (1 - MORPH_FLAT) * open);
    const angle = Math.PI - Math.PI * 2 * position;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // The ellipse's outward normal, (cos / width, sin / height) normalised.
    const nx = cos / MORPH_RADIUS;
    const ny = sin / height;
    const norm = Math.hypot(nx, ny);
    return { x: MORPH_RADIUS * cos, y: height * sin, nx: nx / norm, ny: ny / norm, spectrum: (1 + sin) / 2 };
  };

  /** A point on the stroke at spectrum position `spectrum`: on the ring, on its left or right side at random. */
  const atSpectrum = (spectrum: number) => {
    if (!morph) {
      return curve(spectrum);
    }
    const rise = Math.asin(2 * spectrum - 1);
    const angle = Math.random() < 0.5 ? rise : Math.PI - rise;
    return curve(((((Math.PI - angle) / (Math.PI * 2)) % 1) + 1) % 1);
  };

  let phase = 0;
  let spawned = 0;
  return {
    update: ({ time, delta, signals }, config) => {
      const { waveAmplitude, jitter, waveSpeed, particles, separation, thickness, gain = 3 } = config;
      const { level, linear } = signals.voice;
      paper.set(config.paper);
      material.color.set(config.ink);
      // Accumulated, so changing the speed changes the pace without jumping the wave.
      phase += delta * waveSpeed;
      if (morph) {
        const target = Math.min(1, level * gain);
        open += (target - open) * Math.min(1, delta / (target > open ? MORPH_IN : MORPH_OUT));
      }
      const count = Math.max(1, Math.min(MAX_STRANDS, Math.round(config.strands)));
      const idle = idleness(level);
      const middle = (count - 1) / 2;
      const share = 1.4 / Math.sqrt(count);
      strands.forEach((strand, index) => {
        strand.mesh.visible = index < count;
        if (!strand.mesh.visible) {
          return;
        }
        const own = phase + strand.phase;
        const base = (index - middle) * separation * 2;
        const taper = count > 1 ? 1 - 0.7 * (Math.abs(index - middle) / middle) ** 1.2 : 1;
        const weight = (count > 1 ? share : 1) * taper;
        for (let sample = 0; sample <= SAMPLES; sample++) {
          const point = curve(sample / SAMPLES);
          // Waves and energy follow the spectrum position, whatever the shape.
          const position = point.spectrum;
          const x = (position * 2 - 1) * HALF_WIDTH;
          const energy = energyAt(linear, position);
          // The line, a brush stroke, tapers to a point at both ends; the ring has no ends.
          const brush = morph ? 1 : Math.sin(Math.PI * position) ** 0.6;
          const width =
            ((0.035 + Math.sin(x * 2.1 + own * 0.7) * 0.006 + Math.sin(x * 4.7 - own * 0.4) * 0.004) * weight +
              energy * 0.22 * weight * thickness) *
            brush;
          // Standing waves, faster toward the high end, so the line shakes in place where it sounds.
          const rate = 8 + position * 40;
          const vibration =
            energy * 0.06 * (Math.sin(x * (6 + position * 18)) * Math.sin(time * rate) * (1 - position * 0.4));
          const offset =
            base +
            vibration +
            idle *
              (waveAmplitude *
                (Math.sin(x * 1.3 + own * 0.9) * 0.05 +
                  Math.sin(x * 2.2 - own * 1.37 + 1) * 0.03 +
                  Math.sin(x * 3.7 + own * 2.11 + 2) * 0.015) +
                jitter *
                  (Math.sin(x * 9 + own * 7.3) * 0.008 +
                    Math.sin(x * 15 - own * 11.9 + 3) * 0.005 +
                    Math.sin(x * 24 + own * 17.1 + 1) * 0.004));
          const above = offset + width / 2;
          const below = offset - width / 2;
          strand.positions.set(
            [
              point.x + point.nx * above,
              point.y + point.ny * above,
              0,
              point.x + point.nx * below,
              point.y + point.ny * below,
              0,
            ],
            sample * 6,
          );
        }
        strand.geometry.attributes.position.needsUpdate = true;
        strand.geometry.computeBoundingSphere();
      });

      // Loud points shed blots that drift off either side of the stroke; the total rate matches the ring's.
      linear.forEach((energy, index) => {
        if (energy <= 0.35) {
          return;
        }
        const owed = energy * delta * particles * (BANDS / linear.length);
        const due = Math.floor(owed) + (Math.random() < owed % 1 ? 1 : 0);
        for (let spawn = 0; spawn < due; spawn++) {
          const blot = blots[spawned++ % blots.length];
          const point = atSpectrum((index + Math.random()) / linear.length);
          const side = Math.random() < 0.5 ? -1 : 1;
          blot.dx = point.nx * side;
          blot.dy = point.ny * side;
          blot.x = point.x + blot.dx * 0.05;
          blot.y = point.y + blot.dy * 0.05;
          blot.size = 0.02 + energy * 0.05 * Math.random();
          blot.age = 0;
          blot.life = 1.2 + Math.random() * 1.5;
          blot.mesh.visible = true;
        }
      });
      for (const blot of blots) {
        if (!blot.mesh.visible) {
          continue;
        }
        blot.age += delta;
        const progress = blot.age / blot.life;
        if (progress >= 1) {
          blot.mesh.visible = false;
          continue;
        }
        const step = delta * 0.18 * (1 - progress);
        blot.x += blot.dx * step;
        blot.y += blot.dy * step;
        blot.mesh.position.set(blot.x, blot.y, 0.01);
        blot.mesh.scale.setScalar(blot.size * (1 + progress * 1.5));
        blot.material.color.copy(material.color);
        blot.material.opacity = 0.85 * (1 - progress) ** 1.5;
      }
    },
    dispose: () => {
      strands.forEach(({ geometry }) => geometry.dispose());
      material.dispose();
      blotGeometry.dispose();
      blots.forEach(({ material: blotMaterial }) => blotMaterial.dispose());
    },
  };
};
