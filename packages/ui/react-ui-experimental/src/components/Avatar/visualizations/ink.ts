//
// Copyright 2026 DXOS.org
//

import * as THREE from 'three';

import { type Visualization } from '../visualization.ts';
import { INK_BLOTS, type InkConfig, MAX_STRANDS, idleness, inkDefaults, inkParams, inkPresets } from './common.ts';

/** Angular samples around the ink ring. */
const SEGMENTS = 360;
const RADIUS = 1.05;

/**
 * An ink ring on paper, after the heptapod logograms in the film Arrival, drawn with one or more overlapping strands.
 * Each strand owns a contiguous slice of the spectrum (lowest on the inside): it vibrates while its slice sounds (low
 * strands in broad, slow undulations, high ones in fine, fast ripples), its slice's bands thicken arcs around it, and
 * it sheds blots that drift outward, spread and fade. Passive, the strands are thin, wobble in an irregular wave and
 * turn slowly.
 */
export const ink: Visualization<InkConfig> = {
  id: 'ink',
  title: 'Ink',
  params: inkParams,
  defaults: inkDefaults,
  presets: inkPresets,
  create: ({ scene }) => {
    const paper = new THREE.Color();
    scene.background = paper;
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const ring = new THREE.Group();
    // The spectrum starts on the left (bands are laid out from the top, clockwise, before this turn).
    ring.rotation.z = Math.PI / 2;
    scene.add(ring);

    // Each strand is a strip of quads, inner and outer edge per sample, rewritten every frame.
    const indices: number[] = [];
    for (let segment = 0; segment < SEGMENTS; segment++) {
      const inner = segment * 2;
      indices.push(inner, inner + 1, inner + 2, inner + 1, inner + 3, inner + 2);
    }
    const strands = Array.from({ length: MAX_STRANDS }, (_, index) => {
      const positions = new Float32Array((SEGMENTS + 1) * 2 * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = index === 0;
      ring.add(mesh);
      // Fixed per strand, so a strand keeps its own wave as the count changes.
      return { positions, geometry, mesh, phase: index * 1.9, energy: 0, base: RADIUS };
    });

    const blotGeometry = new THREE.CircleGeometry(1, 24);
    const blots = Array.from({ length: INK_BLOTS }, () => {
      const blotMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(blotGeometry, blotMaterial);
      mesh.visible = false;
      ring.add(mesh);
      return { mesh, material: blotMaterial, angle: 0, distance: 0, size: 0, age: 0, life: 0 };
    });

    /**
     * Voice thickness at `angle` (radians from the top, clockwise) from a strand's `slice` of bands, each owning an
     * arc of the strand and spread over its neighbours; a single strand spans the whole spectrum this way.
     */
    const voice = (angle: number, slice: number[]) => {
      let sum = 0;
      slice.forEach((energy, index) => {
        const centre = (index / slice.length) * Math.PI * 2;
        let distance = Math.abs(angle - centre);
        distance = Math.min(distance, Math.PI * 2 - distance);
        sum += energy * Math.exp(-(((distance * slice.length) / 2.2) ** 2));
      });
      return sum;
    };

    let phase = 0;
    let spawned = 0;
    return {
      update: ({ time, delta, signals }, config) => {
        const { waveAmplitude, jitter, waveSpeed, particles, separation, thickness } = config;
        const { level, bands } = signals.voice;
        paper.set(config.paper);
        material.color.set(config.ink);
        // Accumulated, so changing the speed changes the pace without jumping the wave.
        phase += delta * waveSpeed;
        const count = Math.max(1, Math.min(MAX_STRANDS, Math.round(config.strands)));
        // Passive, the strands drift in an irregular wave: undulations whose speeds share no common period, fading
        // out as the voice takes over.
        const idle = idleness(level);
        // More strands share the ink: the middle strand is thickest and they thin progressively toward both edges.
        const middle = (count - 1) / 2;
        const share = 1.4 / Math.sqrt(count);
        strands.forEach((strand, index) => {
          strand.mesh.visible = index < count;
          if (!strand.mesh.visible) {
            return;
          }
          const own = phase + strand.phase;
          // Strands sit in order from the inside out, `separation` apart, centred on the ring's radius.
          const base = RADIUS + (index - middle) * separation;
          const slice = bands.slice(
            Math.floor((index * bands.length) / count),
            Math.floor(((index + 1) * bands.length) / count),
          );
          const energy = slice.reduce((sum, value) => sum + value, 0) / slice.length;
          // Where in the spectrum the slice sits, 0 (lowest) to 1 (highest), sets how it vibrates.
          const pitch = count > 1 ? index / (count - 1) : 0.5;
          const lobes = 3 + Math.round(pitch * 12);
          const rate = 8 + pitch * 40;
          const vibration = energy * 0.045 * (1 - pitch * 0.5);
          strand.energy = energy;
          strand.base = base;
          const taper = count > 1 ? 1 - 0.7 * (Math.abs(index - middle) / middle) ** 1.2 : 1;
          const weight = (count > 1 ? share : 1) * taper;
          for (let sample = 0; sample <= SEGMENTS; sample++) {
            const angle = (sample / SEGMENTS) * Math.PI * 2;
            // A slow, uneven wobble in the width keeps the stroke hand-drawn rather than machined.
            const width =
              (0.035 + Math.sin(angle * 3 + own * 0.7) * 0.006 + Math.sin(angle * 7 - own * 0.4) * 0.004) * weight +
              voice(angle, slice) * 0.22 * weight * thickness;
            // Standing waves, so the strands shake in place on fixed nodes rather than seeming to turn; the vibration
            // follows the sound in real time, whatever the passive wave's speed.
            const centre =
              base +
              vibration *
                (Math.sin(angle * lobes) * Math.sin(time * rate) +
                  0.5 * Math.sin(angle * (lobes * 2 + 1) + 1) * Math.sin(time * rate * 1.6 + 1)) +
              idle *
                (waveAmplitude *
                  (Math.sin(angle * 2 + own * 0.9) * 0.03 +
                    Math.sin(angle * 3 - own * 1.37 + 1) * 0.02 +
                    Math.sin(angle * 5 + own * 2.11 + 2) * 0.012) +
                  jitter *
                    (Math.sin(angle * 13 + own * 7.3) * 0.006 +
                      Math.sin(angle * 23 - own * 11.9 + 3) * 0.004 +
                      Math.sin(angle * 37 + own * 17.1 + 1) * 0.003));
            // Ink spreads outward more than inward, as a brush stroke bleeds into wet paper.
            const inner = centre - width * 0.35;
            const outer = centre + width * 0.65;
            const x = Math.sin(angle);
            const y = Math.cos(angle);
            strand.positions.set([x * inner, y * inner, 0, x * outer, y * outer, 0], sample * 6);
          }
          strand.geometry.attributes.position.needsUpdate = true;
          strand.geometry.computeBoundingSphere();
        });
        // Only the passive drift turns the ring; speech holds it steady.
        ring.rotation.z -= delta * 0.04 * idle * waveSpeed;

        // Loud strands shed blots; how often follows how loud, scaled by the bands a strand holds so the total rate
        // does not depend on the strand count. A high rate can owe several blots in one frame.
        strands.slice(0, count).forEach(({ energy, base }) => {
          if (energy <= 0.35) {
            return;
          }
          const owed = energy * delta * particles * (bands.length / count);
          const due = Math.floor(owed) + (Math.random() < owed % 1 ? 1 : 0);
          for (let spawn = 0; spawn < due; spawn++) {
            const blot = blots[spawned++ % blots.length];
            blot.angle = Math.random() * Math.PI * 2;
            blot.distance = base + 0.05;
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
          blot.distance += delta * 0.18 * (1 - progress);
          blot.mesh.position.set(Math.sin(blot.angle) * blot.distance, Math.cos(blot.angle) * blot.distance, 0.01);
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
  },
};
