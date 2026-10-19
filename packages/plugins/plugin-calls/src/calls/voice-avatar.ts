//
// Copyright 2026 DXOS.org
//

import * as THREE from 'three';

export type VoiceAvatar = {
  /** The avatar's picture, to stand in for a camera. */
  stream: MediaStream;
  close: () => void;
};

export type VoiceAvatarOptions = {
  width?: number;
  height?: number;
  /** Base colour of the shape. */
  color?: string;
};

/** Seconds for the level to rise toward a louder voice and fall back; speech rises fast and decays slowly. */
const ATTACK = 0.04;
const RELEASE = 0.25;

/**
 * An abstract 3D shape that moves with a voice: an icosphere whose surface swells and ripples with the loudness and
 * spectrum of `audioTrack`. Analysing the same track the call plays keeps picture and sound in step, whatever the
 * voice's source (a file, synthesized speech, a live model).
 */
export const createVoiceAvatar = (
  audioContext: AudioContext,
  audioTrack: MediaStreamTrack,
  { width = 640, height = 360, color = '#5b8cff' }: VoiceAvatarOptions = {},
): VoiceAvatar => {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.6;
  const source = audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
  source.connect(analyser);
  const waveform = new Float32Array(analyser.fftSize);
  const spectrum = new Uint8Array(analyser.frequencyBinCount);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(width, height, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0d1117');
  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
  camera.position.set(0, 0, 6);

  const geometry = new THREE.IcosahedronGeometry(1, 5);
  const base = Float32Array.from(geometry.attributes.position.array);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1, flatShading: false });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  scene.add(new THREE.AmbientLight('#ffffff', 0.35));
  const key = new THREE.DirectionalLight('#ffffff', 1.4);
  key.position.set(2, 3, 4);
  scene.add(key);
  const rim = new THREE.PointLight(color, 6, 12);
  rim.position.set(-3, -1, 2);
  scene.add(rim);

  let level = 0;
  let low = 0;
  let high = 0;
  let last = performance.now();
  let frame = 0;

  const render = (now: number) => {
    const delta = Math.min(0.1, (now - last) / 1_000);
    last = now;
    const time = now / 1_000;

    analyser.getFloatTimeDomainData(waveform);
    analyser.getByteFrequencyData(spectrum);
    const rms = Math.sqrt(waveform.reduce((sum, value) => sum + value * value, 0) / waveform.length);
    const target = Math.min(1, rms * 6);
    level += (target - level) * Math.min(1, delta / (target > level ? ATTACK : RELEASE));
    const band = (from: number, to: number) => {
      let sum = 0;
      for (let index = from; index < to; index++) {
        sum += spectrum[index];
      }
      return sum / (to - from) / 255;
    };
    low += (band(2, 12) - low) * Math.min(1, delta / RELEASE);
    high += (band(24, 96) - high) * Math.min(1, delta / RELEASE);

    // Silent, the shape breathes; speaking, its surface ripples with the voice's low and high bands.
    const positions = geometry.attributes.position.array;
    for (let index = 0; index < positions.length; index += 3) {
      const x = base[index];
      const y = base[index + 1];
      const z = base[index + 2];
      const ripple =
        Math.sin(x * 3 + time * 2.1) * Math.sin(y * 3 + time * 1.7) * (0.04 + low * 0.35) +
        Math.sin(z * 7 + time * 6.3) * Math.sin(x * 6 - time * 5.1) * high * 0.18;
      const scale = 1 + Math.sin(time * 1.2) * 0.015 + level * 0.18 + ripple;
      positions[index] = x * scale;
      positions[index + 1] = y * scale;
      positions[index + 2] = z * scale;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    mesh.rotation.y += delta * (0.15 + level * 0.6);
    mesh.rotation.x = Math.sin(time * 0.4) * 0.15;
    rim.intensity = 4 + level * 30;
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
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
};
