//
// Copyright 2026 DXOS.org
//

import * as THREE from 'three';

import { type SceneContext } from '../../three/index.ts';

export type KubeOptions = {
  /** Particles drawn, up to `MAX_KUBE_PARTICLES`. */
  particles: number;
  /** Particles closer than this are joined by a line. */
  distance: number;
  /** Drift speed of the particles. */
  speed: number;
  /** How much the input level speeds the particles and lengthens their links. */
  reaction: number;
  /** Turn rate of the cube. */
  rotation: number;
  color: string;
  /** The colour the particles and links glow toward as the input rises. */
  speakingColor: string;
};

export type KubeScene = {
  /** `value` is the input level (e.g. a voice's loudness), 0 to about 1. */
  update(delta: number, value: number, options: KubeOptions): void;
  dispose(): void;
};

/** Particles the buffers are sized for. */
export const MAX_KUBE_PARTICLES = 300;

/** Edge of the cube the particles bounce inside. */
const SIZE = 2.2;

/**
 * Particles drifting inside a cube, joined by lines where they pass close
 * (after https://threejs.org/examples/#webgl_buffergeometry_drawrange). The input level quickens them and lengthens
 * their reach, so the web of links thickens and brightens.
 */
export const createKubeScene = ({ scene }: Pick<SceneContext, 'scene'>): KubeScene => {
  const group = new THREE.Group();
  scene.add(group);

  const box = new THREE.BoxGeometry(SIZE, SIZE, SIZE);
  const edges = new THREE.EdgesGeometry(box);
  box.dispose();
  const frameMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.15 });
  group.add(new THREE.LineSegments(edges, frameMaterial));

  const positions = new Float32Array(MAX_KUBE_PARTICLES * 3);
  const velocities = new Float32Array(MAX_KUBE_PARTICLES * 3);
  for (let index = 0; index < MAX_KUBE_PARTICLES * 3; index++) {
    positions[index] = (Math.random() - 0.5) * SIZE;
    velocities[index] = Math.random() * 2 - 1;
  }
  const particles = new THREE.BufferGeometry();
  particles.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  const pointMaterial = new THREE.PointsMaterial({
    size: 3,
    sizeAttenuation: false,
    blending: THREE.AdditiveBlending,
    transparent: true,
  });
  group.add(new THREE.Points(particles, pointMaterial));

  const maxSegments = (MAX_KUBE_PARTICLES * (MAX_KUBE_PARTICLES - 1)) / 2;
  const linePositions = new Float32Array(maxSegments * 6);
  const lineColors = new Float32Array(maxSegments * 6);
  const lines = new THREE.BufferGeometry();
  lines.setAttribute('position', new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage));
  lines.setAttribute('color', new THREE.BufferAttribute(lineColors, 3).setUsage(THREE.DynamicDrawUsage));
  const lineMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
  });
  const links = new THREE.LineSegments(lines, lineMaterial);
  // The links move every frame, so a bounding sphere computed once would cull them wrongly.
  links.frustumCulled = false;
  group.add(links);

  const silent = new THREE.Color();
  const loud = new THREE.Color();
  const tint = new THREE.Color();
  const half = SIZE / 2;
  return {
    update: (delta, value, { particles: requested, distance, speed, reaction, rotation, color, speakingColor }) => {
      const count = Math.min(MAX_KUBE_PARTICLES, Math.round(requested));
      const drive = value * reaction;
      const step = delta * speed * (1 + drive * 4);
      const reach = distance * (1 + drive * 0.6);

      silent.set(color);
      loud.set(speakingColor);
      tint.copy(silent).lerp(loud, Math.min(1, value * 1.6));
      pointMaterial.color.copy(tint);
      frameMaterial.color.copy(tint);

      for (let index = 0; index < count * 3; index++) {
        positions[index] += velocities[index] * step;
        if (positions[index] < -half || positions[index] > half) {
          velocities[index] = -velocities[index];
          positions[index] = Math.max(-half, Math.min(half, positions[index]));
        }
      }

      let vertex = 0;
      const brightness = 0.6 + drive;
      for (let first = 0; first < count; first++) {
        for (let second = first + 1; second < count; second++) {
          const dx = positions[first * 3] - positions[second * 3];
          const dy = positions[first * 3 + 1] - positions[second * 3 + 1];
          const dz = positions[first * 3 + 2] - positions[second * 3 + 2];
          const gap = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (gap >= reach) {
            continue;
          }
          const alpha = (1 - gap / reach) * brightness;
          for (const particle of [first, second]) {
            linePositions[vertex] = positions[particle * 3];
            linePositions[vertex + 1] = positions[particle * 3 + 1];
            linePositions[vertex + 2] = positions[particle * 3 + 2];
            lineColors[vertex] = tint.r * alpha;
            lineColors[vertex + 1] = tint.g * alpha;
            lineColors[vertex + 2] = tint.b * alpha;
            vertex += 3;
          }
        }
      }

      particles.setDrawRange(0, count);
      particles.attributes.position.needsUpdate = true;
      lines.setDrawRange(0, vertex / 3);
      lines.attributes.position.needsUpdate = true;
      lines.attributes.color.needsUpdate = true;

      const turn = delta * rotation * (1 + drive);
      group.rotation.x += turn;
      group.rotation.y += turn;
    },
    dispose: () => {
      scene.remove(group);
      edges.dispose();
      particles.dispose();
      lines.dispose();
      frameMaterial.dispose();
      pointMaterial.dispose();
      lineMaterial.dispose();
    },
  };
};
