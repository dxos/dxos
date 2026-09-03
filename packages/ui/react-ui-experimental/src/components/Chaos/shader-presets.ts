//
// Copyright 2024 DXOS.org
//

// TODO(wittjosiah): Typing here broke when upgrading to React 19.
// @ts-nocheck
import { type ShaderOptions } from '../../shaders/index.ts';

// Kept out of `Chaos.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

export const shaderPresets: Record<string, ShaderOptions> = {
  heptapod: {
    aperture: 5.6,
    fov: 50,
    zoom: 0.8,
    distance: 2,
    focus: 0.05,
    rotation: 0,
    size: 500,
    speed: 24,
    curl: 0.7,
    chaos: 1,
    alpha: 0.53,
    gain: 0.9,
    color: [0, 0.2, 0.6],
  },
  spore: {
    aperture: 5.6,
    fov: 50,
    zoom: 0.8,
    distance: 2,
    focus: 0.3,
    rotation: 0,
    size: 500,
    speed: 24,
    curl: 1,
    chaos: 1,
    alpha: 0.53,
    gain: 0.9,
    color: [0, 0.2, 0.6],
  },
  portal: {
    aperture: 5.6,
    fov: 64,
    zoom: 1.1,
    distance: 2,
    focus: 0,
    rotation: 0,
    size: 500,
    speed: 30,
    curl: 0.01,
    chaos: 1,
    alpha: 0.4,
    gain: 0.9,
    color: [0, 0.2, 0.6],
  },
  droplet: {
    aperture: 5.6,
    fov: 82,
    zoom: 2.7,
    distance: 2,
    focus: 0.18,
    rotation: 0,
    size: 500,
    speed: 15,
    curl: 0.01,
    chaos: 5,
    alpha: 0.1,
    gain: 0.9,
    color: [0, 0.2, 0.6],
  },
};

export const defaultShaderOptions = Object.values(shaderPresets)[0];
