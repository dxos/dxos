//
// Copyright 2026 DXOS.org
//

import * as THREE from 'three';

import { type Visualization } from '../visualization.ts';
import { type GlowConfig, glowDefaults, glowParams, waveParams } from './common.ts';

export type TorusKnotConfig = GlowConfig & { waveSpeed: number };

/** A torus knot whose tube swells and ripples with the voice's loudness and its low and high bands. */
export const torusKnot: Visualization<TorusKnotConfig> = {
  id: 'torus-knot',
  title: 'Torus knot',
  params: { waveSpeed: waveParams.waveSpeed, ...glowParams },
  defaults: { waveSpeed: 1, ...glowDefaults },
  presets: {},
  create: ({ scene }) => {
    const geometry = new THREE.TorusKnotGeometry(0.7, 0.22, 256, 32);
    const base = Float32Array.from(geometry.attributes.position.array);
    // Displacing along the tube's own normal swells the knot's surface rather than its whole path.
    const normals = Float32Array.from(geometry.attributes.normal.array);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1 });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    const rim = new THREE.PointLight('#ffffff', 6, 12);
    rim.position.set(-3, -1, 2);
    scene.add(rim);
    const silent = new THREE.Color();
    const loud = new THREE.Color();
    // Sibilants (the high band) lighten the speaking colour, so bright consonants flash.
    const bright = new THREE.Color();
    const white = new THREE.Color('#ffffff');

    let phase = 0;
    return {
      update: ({ delta, signals }, { waveSpeed, color, speakingColor }) => {
        const { level, low, high } = signals.voice;
        // Accumulated, so speed 0 freezes the passive motion.
        phase += delta * waveSpeed;
        const time = phase;
        const positions = geometry.attributes.position.array;
        for (let index = 0; index < positions.length; index += 3) {
          const x = base[index];
          const y = base[index + 1];
          const z = base[index + 2];
          const angle = Math.atan2(y, x);
          const swell =
            Math.sin(time * 1.2) * 0.01 +
            level * 0.04 +
            Math.sin(angle * 5 + time * (1.2 + level)) * (0.01 + low * 0.08) +
            Math.sin(angle * 13 - time * 4) * Math.sin(z * 8 + time * 3) * high * 0.05;
          positions[index] = x + normals[index] * swell;
          positions[index + 1] = y + normals[index + 1] * swell;
          positions[index + 2] = z + normals[index + 2] * swell;
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();

        mesh.rotation.y += delta * (0.12 + level * 0.3) * waveSpeed;
        mesh.rotation.x = 0.5 + Math.sin(time * 0.4) * 0.12 + Math.sin(time * 4) * level * 0.02;
        // A small bob on each syllable reads as talking even when the shape is small on a tile.
        mesh.position.y = Math.sin(time * 7) * level * 0.015;
        silent.set(color);
        loud.set(speakingColor);
        bright.copy(loud).lerp(white, 0.6);
        material.color
          .copy(silent)
          .lerp(loud, Math.min(0.7, level * 1.2))
          .lerp(bright, Math.min(0.3, high));
        material.emissive.copy(material.color).multiplyScalar(level * 0.15);
        rim.color.copy(material.color);
        rim.intensity = 4 + level * 12;
      },
      dispose: () => {
        geometry.dispose();
        material.dispose();
      },
    };
  },
};
