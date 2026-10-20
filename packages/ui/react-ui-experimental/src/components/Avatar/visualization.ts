//
// Copyright 2026 DXOS.org
//

import type * as THREE from 'three';

import { type Config, type ParamsOf } from './params.ts';
import { type AgentSignals, type FrameTime, type SignalEvent } from './signals.ts';

/** One rendered frame: when it is, and what the providers have said. */
export type Frame = FrameTime & { signals: AgentSignals; events: SignalEvent[] };

export type VisualizationContext = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** For visualizations that render a pass of their own (e.g. a simulation into a texture) before the scene. */
  renderer: THREE.WebGLRenderer;
};

export type VisualizationInstance<C extends Config> = {
  /** Runs every frame with the latest signals and the current config; changing config never rebuilds the scene. */
  update(frame: Frame, config: C): void;
  dispose(): void;
};

/** An abstract look for an agent, with a typed, described configuration. */
export type Visualization<C extends Config> = {
  readonly id: string;
  readonly title: string;
  /** Describes every config field (range, step, colour), driving validation and the tuning panel. */
  readonly params: ParamsOf<C>;
  readonly defaults: C;
  readonly presets: Readonly<Record<string, Partial<C>>>;
  create(context: VisualizationContext): VisualizationInstance<C>;
};

/** Any registered visualization, whatever its config. */
export type AnyVisualization = Visualization<Config>;
