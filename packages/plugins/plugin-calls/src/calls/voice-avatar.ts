//
// Copyright 2026 DXOS.org
//

import * as THREE from 'three';

export type VoiceAvatar = {
  /** The avatar's picture, to stand in for a camera. */
  stream: MediaStream;
  close: () => void;
};

/**
 * `torus`: one ring that swells with the voice; `spectrum`: a row of 16 blobs, one per frequency band; `ink`: an ink ring
 * whose arcs thicken and shed blots with their bands, after the heptapod logograms in the film Arrival.
 */
export type VoiceAvatarVariant = 'torus' | 'spectrum' | 'ink';

export type VoiceAvatarOptions = {
  variant?: VoiceAvatarVariant;
  width?: number;
  height?: number;
  /** Colour while silent. */
  color?: string;
  /** Colour it glows toward while speaking loudly. */
  speakingColor?: string;
};

/** Seconds for a level to rise toward a louder voice and fall back; speech rises fast and decays slowly. */
const ATTACK = 0.04;
const RELEASE = 0.25;

/** The spectrum variant's bands: log-spaced across the voice's range, as hearing is. */
const BANDS = 16;
const LOWEST_HZ = 80;
const HIGHEST_HZ = 8_000;

/** What the analyser hears on one frame, every value smoothed and in 0..1. */
type Hearing = { time: number; delta: number; level: number; low: number; high: number; bands: number[] };

type Shape = { update: (hearing: Hearing) => void; dispose: () => void };

type Palette = { silent: THREE.Color; loud: THREE.Color };

/**
 * An abstract 3D shape that moves with a voice, analysing the same track the call plays so picture and sound stay
 * in step whatever the voice's source (a file, synthesized speech, a live model).
 */
export const createVoiceAvatar = (
  audioContext: AudioContext,
  audioTrack: MediaStreamTrack,
  {
    variant = 'torus',
    width = 640,
    height = 360,
    color = '#5b8cff',
    speakingColor = '#2ecc71',
  }: VoiceAvatarOptions = {},
): VoiceAvatar => {
  const analyser = audioContext.createAnalyser();
  // 2048 points resolve about 23 Hz per bin at 48 kHz, fine enough for the lowest voice band.
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.6;
  const source = audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
  source.connect(analyser);
  const waveform = new Float32Array(analyser.fftSize);
  const spectrum = new Uint8Array(analyser.frequencyBinCount);
  const binOf = (hz: number) =>
    Math.min(spectrum.length - 1, Math.round((hz / (audioContext.sampleRate / 2)) * spectrum.length));
  const edges = Array.from({ length: BANDS + 1 }, (_, index) =>
    binOf(LOWEST_HZ * (HIGHEST_HZ / LOWEST_HZ) ** (index / BANDS)),
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(width, height, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0d1117');
  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
  camera.position.set(0, 0, 6);
  scene.add(new THREE.AmbientLight('#ffffff', 0.35));
  const key = new THREE.DirectionalLight('#ffffff', 1.4);
  key.position.set(2, 3, 4);
  scene.add(key);

  const palette = { silent: new THREE.Color(color), loud: new THREE.Color(speakingColor) };
  const shape =
    variant === 'spectrum'
      ? spectrumShape(scene, palette)
      : variant === 'ink'
        ? inkShape(scene)
        : torusShape(scene, palette);

  const hearing: Hearing = { time: 0, delta: 0, level: 0, low: 0, high: 0, bands: new Array(BANDS).fill(0) };
  const smooth = (current: number, target: number, delta: number) =>
    current + (target - current) * Math.min(1, delta / (target > current ? ATTACK : RELEASE));
  const band = (from: number, to: number) => {
    let sum = 0;
    for (let index = from; index < Math.max(to, from + 1); index++) {
      sum += spectrum[index];
    }
    return sum / Math.max(1, to - from) / 255;
  };

  let last = performance.now();
  let frame = 0;
  const render = (now: number) => {
    const delta = Math.min(0.1, (now - last) / 1_000);
    last = now;
    analyser.getFloatTimeDomainData(waveform);
    analyser.getByteFrequencyData(spectrum);
    const rms = Math.sqrt(waveform.reduce((sum, value) => sum + value * value, 0) / waveform.length);
    hearing.time = now / 1_000;
    hearing.delta = delta;
    hearing.level = smooth(hearing.level, Math.min(1, rms * 3), delta);
    hearing.low = smooth(hearing.low, band(binOf(90), binOf(500)), delta);
    hearing.high = smooth(hearing.high, band(binOf(2_000), binOf(8_000)), delta);
    // The analyser's floor sits around a quarter of full scale, so energy is read from there up.
    hearing.bands.forEach((value, index) => {
      const energy = Math.max(0, Math.min(1, (band(edges[index], edges[index + 1]) - 0.25) / 0.5));
      hearing.bands[index] = smooth(value, energy, delta);
    });
    shape.update(hearing);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  };
  frame = requestAnimationFrame(render);

  const stream = canvas.captureStream(30);
  return {
    stream,
    close: () => {
      cancelAnimationFrame(frame);
      stream.getTracks().forEach((track) => track.stop());
      source.disconnect();
      shape.dispose();
      renderer.dispose();
    },
  };
};

/** A ring whose tube swells and ripples with the voice's loudness and its low and high bands. */
const torusShape = (scene: THREE.Scene, palette: Palette): Shape => {
  const geometry = new THREE.TorusGeometry(1, 0.38, 48, 128);
  const base = Float32Array.from(geometry.attributes.position.array);
  // Displacing along the tube's own normal swells the ring's surface rather than its whole radius.
  const normals = Float32Array.from(geometry.attributes.normal.array);
  const material = new THREE.MeshStandardMaterial({ color: palette.silent, roughness: 0.35, metalness: 0.1 });
  // Sibilants (the high band) lighten the green, so bright consonants flash.
  const bright = new THREE.Color('#a8f0c6');
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  const rim = new THREE.PointLight(palette.silent, 6, 12);
  rim.position.set(-3, -1, 2);
  scene.add(rim);

  return {
    update: ({ time, delta, level, low, high }) => {
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

      mesh.rotation.y += delta * (0.12 + level * 0.3);
      mesh.rotation.x = 0.5 + Math.sin(time * 0.4) * 0.12 + Math.sin(time * 4) * level * 0.02;
      // A small bob on each syllable reads as talking even when the shape is small on a tile.
      mesh.position.y = Math.sin(time * 7) * level * 0.015;
      material.color
        .copy(palette.silent)
        .lerp(palette.loud, Math.min(0.7, level * 1.2))
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
};

/**
 * A row of blobs, lowest band on the left. Passive, they ride a slow wave along the row; speaking, each stretches
 * upward with its band and pinches at its waist, keeping its volume.
 */
const spectrumShape = (scene: THREE.Scene, palette: Palette): Shape => {
  const radius = 0.12;
  const spacing = 0.27;
  const blobs = Array.from({ length: BANDS }, (_, index) => {
    // Each blob has its own geometry, since the waist pinch reshapes its vertices.
    const geometry = new THREE.SphereGeometry(radius, 24, 16);
    const base = Float32Array.from(geometry.attributes.position.array);
    const material = new THREE.MeshStandardMaterial({ color: palette.silent, roughness: 0.35, metalness: 0.1 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (index - (BANDS - 1) / 2) * spacing;
    scene.add(mesh);
    return { mesh, geometry, base, material, pinch: 0 };
  });

  return {
    update: ({ time, level, bands }) => {
      // The wave fades as the voice takes over, so speech reads as the bands and not the swell.
      const idle = Math.max(0, 1 - level * 4);
      blobs.forEach((blob, index) => {
        const { mesh, geometry, base, material } = blob;
        const energy = bands[index];
        const stretch = 1 + energy * 2.2;
        const squeeze = 1 / Math.sqrt(stretch);
        mesh.scale.set(squeeze, stretch, squeeze);
        mesh.position.y = Math.sin(time * 1.4 - index * 0.45) * idle * 0.08;

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

        material.color.copy(palette.silent).lerp(palette.loud, Math.min(1, energy * 1.2));
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
};

/** Angular samples around the ink ring. */
const INK_SEGMENTS = 360;
const INK_BLOTS = 48;

/**
 * An ink ring on pale mist. Each band owns an arc (lowest at the top, rising clockwise), which thickens with the
 * band's energy and sheds blots that drift outward, spread and fade; passive, the ring is thin and turns slowly.
 */
const inkShape = (scene: THREE.Scene): Shape => {
  scene.background = new THREE.Color('#e9e7e2');
  const ink = new THREE.Color('#151515');
  const radius = 1.05;

  // A strip of quads, inner and outer edge per sample, rewritten every frame.
  const positions = new Float32Array((INK_SEGMENTS + 1) * 2 * 3);
  const indices: number[] = [];
  for (let segment = 0; segment < INK_SEGMENTS; segment++) {
    const inner = segment * 2;
    indices.push(inner, inner + 1, inner + 2, inner + 1, inner + 3, inner + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  const material = new THREE.MeshBasicMaterial({ color: ink, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(geometry, material);
  scene.add(ring);

  const blotGeometry = new THREE.CircleGeometry(1, 24);
  const blots = Array.from({ length: INK_BLOTS }, () => {
    const blotMaterial = new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(blotGeometry, blotMaterial);
    mesh.visible = false;
    ring.add(mesh);
    return { mesh, material: blotMaterial, angle: 0, distance: 0, size: 0, age: 0, life: 0 };
  });

  /** Thickness at `angle` (radians from the top, clockwise): each band's energy, spread over its neighbours. */
  const thickness = (angle: number, bands: number[], time: number) => {
    let sum = 0;
    bands.forEach((energy, index) => {
      const centre = (index / bands.length) * Math.PI * 2;
      let distance = Math.abs(angle - centre);
      distance = Math.min(distance, Math.PI * 2 - distance);
      sum += energy * Math.exp(-(((distance * bands.length) / 2.2) ** 2));
    });
    // A slow, uneven wobble keeps the passive ring hand-drawn rather than machined.
    const wobble = Math.sin(angle * 3 + time * 0.7) * 0.006 + Math.sin(angle * 7 - time * 0.4) * 0.004;
    return 0.035 + wobble + sum * 0.22;
  };

  let spawned = 0;
  return {
    update: ({ time, delta, level, bands }) => {
      // Passive, the circle drifts in an irregular wave: undulations whose speeds share no common period, fading out
      // as the voice takes over.
      const idle = Math.max(0, 1 - level * 4);
      for (let sample = 0; sample <= INK_SEGMENTS; sample++) {
        const angle = (sample / INK_SEGMENTS) * Math.PI * 2;
        const width = thickness(angle, bands, time);
        const centre =
          radius +
          idle *
            (Math.sin(angle * 2 + time * 0.9) * 0.03 +
              Math.sin(angle * 3 - time * 1.37 + 1) * 0.02 +
              Math.sin(angle * 5 + time * 2.11 + 2) * 0.012);
        // Ink spreads outward more than inward, as a brush stroke bleeds into wet paper.
        const inner = centre - width * 0.35;
        const outer = centre + width * 0.65;
        const x = Math.sin(angle);
        const y = Math.cos(angle);
        positions.set([x * inner, y * inner, 0, x * outer, y * outer, 0], sample * 6);
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.computeBoundingSphere();
      ring.rotation.z -= delta * (0.04 + level * 0.1);

      // Loud bands shed blots; how often follows how loud.
      bands.forEach((energy, index) => {
        if (energy > 0.35 && Math.random() < energy * delta * 6) {
          const blot = blots[spawned++ % blots.length];
          blot.angle = (index / bands.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
          blot.distance = radius + 0.05;
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
        blot.material.opacity = 0.85 * (1 - progress) ** 1.5;
      }
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
      blotGeometry.dispose();
      blots.forEach(({ material: blotMaterial }) => blotMaterial.dispose());
    },
  };
};
