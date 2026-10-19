//
// Copyright 2026 DXOS.org
//

import * as THREE from 'three';

export type VoiceAvatar = {
  /** The avatar's picture, to stand in for a camera. */
  stream: MediaStream;
  close: () => void;
};

/** `torus`: one ring that swells with the voice; `spectrum`: a row of 16 blobs, one per frequency band. */
export type VoiceAvatarVariant = 'torus' | 'spectrum';

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
  const shape = variant === 'spectrum' ? spectrumShape(scene, palette) : torusShape(scene, palette);

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

/** A row of blobs, lowest band on the left, each stretched upward and narrowed (keeping its volume) by its band. */
const spectrumShape = (scene: THREE.Scene, palette: Palette): Shape => {
  const geometry = new THREE.SphereGeometry(0.12, 24, 12);
  const spacing = 0.27;
  const blobs = Array.from({ length: BANDS }, (_, index) => {
    const material = new THREE.MeshStandardMaterial({ color: palette.silent, roughness: 0.35, metalness: 0.1 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (index - (BANDS - 1) / 2) * spacing;
    scene.add(mesh);
    return { mesh, material };
  });

  return {
    update: ({ time, level, bands }) => {
      // Silent, the blobs jitter so the row reads as alive; the jitter fades as the voice takes over.
      const idle = Math.max(0, 1 - level * 4);
      blobs.forEach(({ mesh, material }, index) => {
        const energy = bands[index];
        const jitter =
          (Math.sin(time * 11 + index * 2.3) * Math.sin(time * 7.3 + index * 5.1) + Math.sin(time * 17 + index)) * 0.5;
        const stretch = 1 + energy * 2.2 + jitter * idle * 0.12;
        const squeeze = 1 / Math.sqrt(stretch);
        mesh.scale.set(squeeze, stretch, squeeze);
        mesh.position.y = Math.sin(time * 9 + index * 3.7) * Math.sin(time * 5.3 + index) * idle * 0.03;
        material.color.copy(palette.silent).lerp(palette.loud, Math.min(1, energy * 1.2));
        material.emissive.copy(material.color).multiplyScalar(energy * 0.25);
      });
    },
    dispose: () => {
      geometry.dispose();
      blobs.forEach(({ material }) => material.dispose());
    },
  };
};
