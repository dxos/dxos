//
// Copyright 2026 DXOS.org
//

import * as THREE from 'three';

import { type Config } from './params.ts';
import { SignalBus, type SignalProvider } from './signals.ts';
import { type Visualization } from './visualization.ts';

export type AgentVisualizationOptions<C extends Config> = {
  visualization: Visualization<C>;
  /** Overrides of the visualization's defaults. */
  config?: Partial<C>;
  providers?: SignalProvider[];
  width?: number;
  height?: number;
  /** Frames per second captured into `stream`. */
  frameRate?: number;
};

export type VisualizationRuntime<C extends Config> = {
  /** The picture, for mounting in the DOM. */
  canvas: HTMLCanvasElement;
  /** The picture as a camera track, for a call tile. */
  stream: MediaStream;
  /** The current config; changes apply on the next frame, without rebuilding the scene. */
  configure(config: Partial<C>): void;
  readonly config: C;
  close(): void;
};

/** Seconds a frame may claim at most, so a stalled tab does not jump the animation. */
const MAX_DELTA = 0.1;

/**
 * Renders a visualization from its providers' signals: starts the providers, samples them once per animation frame,
 * and draws the visualization into a canvas, also captured as a stream.
 */
export const createAgentVisualization = <C extends Config>({
  visualization,
  config: overrides,
  providers = [],
  width = 640,
  height = 360,
  frameRate = 30,
}: AgentVisualizationOptions<C>): VisualizationRuntime<C> => {
  const config: C = { ...visualization.defaults, ...overrides };

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

  const instance = visualization.create({ scene, camera, renderer });
  const bus = new SignalBus();
  const stops = providers.map((provider) => provider.start(bus));

  const started = performance.now();
  let last = started;
  let frame = 0;
  const render = (now: number) => {
    const time = { time: (now - started) / 1_000, delta: Math.min(MAX_DELTA, (now - last) / 1_000) };
    last = now;
    providers.forEach((provider) => provider.sample?.(time));
    instance.update({ ...time, signals: bus.read(), events: bus.drain() }, config);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  };
  frame = requestAnimationFrame(render);

  const stream = canvas.captureStream(frameRate);
  return {
    canvas,
    stream,
    config,
    configure: (changes) => Object.assign(config, changes),
    close: () => {
      cancelAnimationFrame(frame);
      stops.forEach((stop) => stop());
      stream.getTracks().forEach((track) => track.stop());
      instance.dispose();
      renderer.dispose();
    },
  };
};
