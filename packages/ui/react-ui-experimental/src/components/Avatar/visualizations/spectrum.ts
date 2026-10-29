//
// Copyright 2026 DXOS.org
//

import * as THREE from 'three';

import { BANDS } from '../signals.ts';
import { type Visualization } from '../visualization.ts';
import { type GlowConfig, glowDefaults, glowParams, idleness, waveParams } from './common.ts';

export type SpectrumConfig = GlowConfig & { waveAmplitude: number; waveSpeed: number };

/**
 * A row of blobs, lowest band on the left. Passive, they ride a slow wave along the row; speaking, each stretches
 * upward with its band and pinches at its waist, keeping its volume.
 */
export const spectrum: Visualization<SpectrumConfig> = {
  id: 'spectrum',
  title: 'Spectrum',
  params: { waveAmplitude: waveParams.waveAmplitude, waveSpeed: waveParams.waveSpeed, ...glowParams },
  defaults: { waveAmplitude: 1, waveSpeed: 1, ...glowDefaults },
  presets: {},
  create: ({ scene }) => {
    const radius = 0.12;
    const spacing = 0.27;
    const blobs = Array.from({ length: BANDS }, (_, index) => {
      // Each blob has its own geometry, since the waist pinch reshapes its vertices.
      const geometry = new THREE.SphereGeometry(radius, 24, 16);
      const base = Float32Array.from(geometry.attributes.position.array);
      const material = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.x = (index - (BANDS - 1) / 2) * spacing;
      scene.add(mesh);
      return { mesh, geometry, base, material, pinch: 0 };
    });
    const silent = new THREE.Color();
    const loud = new THREE.Color();

    let phase = 0;
    return {
      update: ({ delta, signals }, { waveAmplitude, waveSpeed, color, speakingColor }) => {
        const { level, bands } = signals.voice;
        // Accumulated, so changing the speed changes the pace without jumping the wave.
        phase += delta * waveSpeed;
        // The wave fades as the voice takes over, so speech reads as the bands and not the swell.
        const idle = idleness(level);
        silent.set(color);
        loud.set(speakingColor);
        blobs.forEach((blob, index) => {
          const { mesh, geometry, base, material } = blob;
          const energy = bands[index];
          const stretch = 1 + energy * 2.2;
          const squeeze = 1 / Math.sqrt(stretch);
          mesh.scale.set(squeeze, stretch, squeeze);
          mesh.position.y = Math.sin(phase * 1.4 - index * 0.45) * idle * 0.08 * waveAmplitude;

          // An hourglass: the equator narrows most, the poles not at all.
          const pinch = Math.min(0.55, energy * 0.8);
          if (Math.abs(pinch - blob.pinch) > 0.005) {
            blob.pinch = pinch;
            const positions = geometry.attributes.position.array;
            for (let vertex = 0; vertex < positions.length; vertex += 3) {
              const height = base[vertex + 1] / radius;
              const waist = 1 - pinch * (1 - height * height);
              positions[vertex] = base[vertex] * waist;
              positions[vertex + 2] = base[vertex + 2] * waist;
            }
            geometry.attributes.position.needsUpdate = true;
            geometry.computeVertexNormals();
          }

          material.color.copy(silent).lerp(loud, Math.min(1, energy * 1.2));
          material.emissive.copy(material.color).multiplyScalar(energy * 0.25);
        });
      },
      dispose: () => {
        blobs.forEach(({ geometry, material }) => {
          geometry.dispose();
          material.dispose();
        });
      },
    };
  },
};
