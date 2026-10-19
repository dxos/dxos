//
// Copyright 2026 DXOS.org
//

import * as THREE from 'three';

export type VoiceAvatar = {
  /** The avatar's picture, to stand in for a camera. */
  stream: MediaStream;
  /** Adjusts the animation while it runs. */
  tune: (tuning: Partial<VoiceAvatarTuning>) => void;
  close: () => void;
};

/** Animation settings that can change while the avatar runs. */
export type VoiceAvatarTuning = {
  /** Scales the passive wave (the ink ring's wobble, the spectrum row's wave); 0 stills it. */
  waveAmplitude: number;
  /** A fine, fast tremble over the ink ring's passive wobble; 0 is smooth. */
  jitter: number;
  /** Pace of the passive wave; 0 freezes it in place. */
  waveSpeed: number;
  /** Blots a fully loud band of the ink ring sheds per second. */
  particles: number;
  /** Overlapping strands the ink ring is drawn with, each on its own radius and wave phase. */
  strands: number;
  /** Radial distance between neighbouring strands. */
  separation: number;
  /** How much the ink strands thicken while speaking; 0 keeps their passive width. */
  thickness: number;
};

export const DEFAULT_TUNING: VoiceAvatarTuning = {
  waveAmplitude: 1,
  jitter: 0,
  waveSpeed: 1,
  particles: 6,
  strands: 1,
  separation: 0.03,
  thickness: 1,
};

/** Named tuning combinations found by hand in the VoiceAvatar story. */
export const TUNING_PRESETS = {
  /** Still strands that shake hard and shed dense ink while speaking. */
  heptapod: {
    waveAmplitude: 0,
    jitter: 3.6,
    waveSpeed: 5,
    particles: 55,
    strands: 7,
    separation: 0.04,
    thickness: 2.2,
  },
  /** Frozen strands, like an etched ring, that tremble and spatter only while speaking. */
  etching: {
    waveAmplitude: 0.3,
    jitter: 3.1,
    waveSpeed: 0,
    particles: 49,
    strands: 5,
    separation: 0.04,
    thickness: 1.5,
  },
  /** Eight strands packed into one fibrous brush stroke that swells while speaking. */
  brush: {
    waveAmplitude: 0.3,
    jitter: 0.3,
    waveSpeed: 3.3,
    particles: 7,
    strands: 8,
    separation: 0.005,
    thickness: 2.3,
  },
  /** Five widely spaced strands drifting slowly, like orbits, that thicken while speaking. */
  orbits: {
    waveAmplitude: 0.2,
    jitter: 1,
    waveSpeed: 0.7,
    particles: 14,
    strands: 5,
    separation: 0.06,
    thickness: 1.9,
  },
} satisfies Record<string, VoiceAvatarTuning>;

/**
 * `torus`: one ring that swells with the voice; `spectrum`: a row of 16 blobs, one per frequency band; `ink`: an ink ring
 * whose arcs thicken and shed blots with their bands, after the heptapod logograms in the film Arrival; `ink-line`: the
 * same ink as a horizontal stroke with frequency running linearly along it; `ink-morph`: a flattened ink ring that
 * opens to a circle while speaking.
 */
export type VoiceAvatarVariant = 'torus' | 'spectrum' | 'ink' | 'ink-line' | 'ink-morph';

export type VoiceAvatarOptions = {
  variant?: VoiceAvatarVariant;
  width?: number;
  height?: number;
  /** Colour while silent. */
  color?: string;
  /** Colour it glows toward while speaking loudly. */
  speakingColor?: string;
  tuning?: Partial<VoiceAvatarTuning>;
};

/** Seconds for a level to rise toward a louder voice and fall back; speech rises fast and decays slowly. */
const ATTACK = 0.04;
const RELEASE = 0.25;

/** The spectrum variant's bands: log-spaced across the voice's range, as hearing is. */
const BANDS = 16;
const LOWEST_HZ = 80;
const HIGHEST_HZ = 8_000;

/** The ink-line variant's resolution: linearly spaced points across the voice's range. */
const LINEAR_POINTS = 64;
const LINEAR_HIGHEST_HZ = 5_000;

/** What the analyser hears on one frame, every value smoothed and in 0..1. */
type Hearing = {
  time: number;
  delta: number;
  level: number;
  low: number;
  high: number;
  /** Log-spaced bands. */
  bands: number[];
  /** Linearly spaced points from `LOWEST_HZ` to `LINEAR_HIGHEST_HZ`. */
  linear: number[];
};

type Shape = { update: (hearing: Hearing, tuning: VoiceAvatarTuning) => void; dispose: () => void };

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
    tuning: initialTuning,
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
  const tuning: VoiceAvatarTuning = { ...DEFAULT_TUNING, ...initialTuning };
  const shape =
    variant === 'spectrum'
      ? spectrumShape(scene, palette)
      : variant === 'ink'
        ? inkShape(scene)
        : variant === 'ink-line'
          ? inkLineShape(scene, false)
          : variant === 'ink-morph'
            ? inkLineShape(scene, true)
            : torusShape(scene, palette);

  const hearing: Hearing = {
    time: 0,
    delta: 0,
    level: 0,
    low: 0,
    high: 0,
    bands: new Array(BANDS).fill(0),
    linear: new Array(LINEAR_POINTS).fill(0),
  };
  const linearEdges = Array.from({ length: LINEAR_POINTS + 1 }, (_, index) =>
    binOf(LOWEST_HZ + ((LINEAR_HIGHEST_HZ - LOWEST_HZ) * index) / LINEAR_POINTS),
  );
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
    hearing.linear.forEach((value, index) => {
      const energy = Math.max(0, Math.min(1, (band(linearEdges[index], linearEdges[index + 1]) - 0.25) / 0.5));
      hearing.linear[index] = smooth(value, energy, delta);
    });
    shape.update(hearing, tuning);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  };
  frame = requestAnimationFrame(render);

  const stream = canvas.captureStream(30);
  return {
    stream,
    tune: (changes) => Object.assign(tuning, changes),
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

  let phase = 0;
  return {
    update: ({ delta, level, low, high }, { waveSpeed }) => {
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

  let phase = 0;
  return {
    update: ({ time, delta, level, bands }, { waveAmplitude, waveSpeed }) => {
      // Accumulated, so changing the speed changes the pace without jumping the wave.
      phase += delta * waveSpeed;
      // The wave fades as the voice takes over, so speech reads as the bands and not the swell.
      const idle = Math.max(0, 1 - level * 4);
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
/** Enough blots for a high emission rate; a spawn past the pool reuses the oldest. */
const INK_BLOTS = 240;
const MAX_STRANDS = 8;

/**
 * An ink ring on pale mist, drawn with one or more overlapping strands. Each strand owns a contiguous slice of the
 * spectrum (lowest on the inside): it vibrates while its slice sounds (low strands in broad, slow undulations, high
 * ones in fine, fast ripples), its slice's bands thicken arcs around it, and it sheds blots that drift outward, spread
 * and fade. Passive, the strands are thin, wobble in an irregular wave and turn slowly.
 */
const inkShape = (scene: THREE.Scene): Shape => {
  scene.background = new THREE.Color('#e9e7e2');
  const ink = new THREE.Color('#151515');
  const radius = 1.05;
  const ring = new THREE.Group();
  // The spectrum starts on the left (bands are laid out from the top, clockwise, before this turn).
  ring.rotation.z = Math.PI / 2;
  scene.add(ring);
  const material = new THREE.MeshBasicMaterial({ color: ink, side: THREE.DoubleSide });

  // Each strand is a strip of quads, inner and outer edge per sample, rewritten every frame.
  const indices: number[] = [];
  for (let segment = 0; segment < INK_SEGMENTS; segment++) {
    const inner = segment * 2;
    indices.push(inner, inner + 1, inner + 2, inner + 1, inner + 3, inner + 2);
  }
  const strands = Array.from({ length: MAX_STRANDS }, (_, index) => {
    const positions = new Float32Array((INK_SEGMENTS + 1) * 2 * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = index === 0;
    ring.add(mesh);
    // Fixed per strand, so a strand keeps its own wave as the count changes.
    return { positions, geometry, mesh, phase: index * 1.9, energy: 0, base: radius };
  });

  const blotGeometry = new THREE.CircleGeometry(1, 24);
  const blots = Array.from({ length: INK_BLOTS }, () => {
    const blotMaterial = new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0 });
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
    update: (
      { time, delta, level, bands },
      { waveAmplitude, jitter, waveSpeed, particles, strands: strandCount, separation, thickness },
    ) => {
      // Accumulated, so changing the speed changes the pace without jumping the wave.
      phase += delta * waveSpeed;
      const count = Math.max(1, Math.min(MAX_STRANDS, Math.round(strandCount)));
      // Passive, the strands drift in an irregular wave: undulations whose speeds share no common period, fading out
      // as the voice takes over.
      const idle = Math.max(0, 1 - level * 4);
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
        const base = radius + (index - middle) * separation;
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
        for (let sample = 0; sample <= INK_SEGMENTS; sample++) {
          const angle = (sample / INK_SEGMENTS) * Math.PI * 2;
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

/** Samples along the ink line. */
const LINE_SAMPLES = 320;
const LINE_HALF_WIDTH = 2.4;
/** The morph's ring radius, matching the ink ring's, and its height when flattened, as a share of it. */
const MORPH_RADIUS = 1.05;
const MORPH_FLAT = 0.04;
/** Loudness that opens the ring fully is `1 / MORPH_GAIN`. */
const MORPH_GAIN = 3;
/** Seconds to open into the circle and to flatten back: near instant, so the ring tracks the voice. */
const MORPH_IN = 0.04;
const MORPH_OUT = 0.08;

/**
 * The ink aesthetic as a horizontal stroke, frequency running linearly from left (low) to right (high). Where a
 * frequency sounds the stroke thickens and vibrates in place (faster toward the high end) and sheds blots that drift
 * away; passive, it is a thin brush line that wobbles in an irregular wave. Strands stack `separation` apart, the
 * middle one thickest; the stroke tapers to a point at both ends. With `morph` it is instead a closed ring of fixed
 * width, flattened in silence, whose height follows the voice's loudness up to a circle; its frequency runs from the
 * bottom point (lowest) up both sides to the top point (highest), so it has no seam.
 */
const inkLineShape = (scene: THREE.Scene, morph: boolean): Shape => {
  scene.background = new THREE.Color('#e9e7e2');
  const ink = new THREE.Color('#151515');
  const group = new THREE.Group();
  scene.add(group);
  const material = new THREE.MeshBasicMaterial({ color: ink, side: THREE.DoubleSide });

  // Each strand is a strip of quads, one edge either side of the curve per sample, rewritten every frame.
  const indices: number[] = [];
  for (let segment = 0; segment < LINE_SAMPLES; segment++) {
    const top = segment * 2;
    indices.push(top, top + 1, top + 2, top + 1, top + 3, top + 2);
  }
  const strands = Array.from({ length: MAX_STRANDS }, (_, index) => {
    const positions = new Float32Array((LINE_SAMPLES + 1) * 2 * 3);
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
    const blotMaterial = new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(blotGeometry, blotMaterial);
    mesh.visible = false;
    group.add(mesh);
    return { mesh, material: blotMaterial, x: 0, y: 0, dx: 0, dy: 1, size: 0, age: 0, life: 0 };
  });

  /** Energy at `position` (0..1 along the line), interpolated between the linear points. */
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
      return { x: (position - 0.5) * 2 * LINE_HALF_WIDTH, y: 0, nx: 0, ny: 1, spectrum: position };
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
    update: (
      { time, delta, level, linear },
      { waveAmplitude, jitter, waveSpeed, particles, strands: strandCount, separation, thickness },
    ) => {
      // Accumulated, so changing the speed changes the pace without jumping the wave.
      phase += delta * waveSpeed;
      if (morph) {
        // The ring's height follows the voice's loudness; this voice's loud syllables reach a full circle.
        const target = Math.min(1, level * MORPH_GAIN);
        open += (target - open) * Math.min(1, delta / (target > open ? MORPH_IN : MORPH_OUT));
      }
      const count = Math.max(1, Math.min(MAX_STRANDS, Math.round(strandCount)));
      const idle = Math.max(0, 1 - level * 4);
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
        for (let sample = 0; sample <= LINE_SAMPLES; sample++) {
          const point = curve(sample / LINE_SAMPLES);
          // Waves and energy follow the spectrum position, whatever the shape.
          const position = point.spectrum;
          const x = (position * 2 - 1) * LINE_HALF_WIDTH;
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
