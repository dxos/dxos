//
// Copyright 2024 DXOS.org
//

import { type ChaosOptions } from './chaos-scene.ts';

// Kept out of `Chaos.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

const base: ChaosOptions = {
  speed: 24,
  curl: 0.7,
  chaos: 1,
  alpha: 0.53,
  gain: 0.9,
  fov: 50,
  zoom: 0.8,
  distance: 2,
  focus: 0.05,
  aperture: 5.6,
  rotation: 0,
  color: '#003399',
};

export const chaosPresets: Record<string, ChaosOptions> = {
  heptapod: base,
  spore: { ...base, curl: 1, focus: 0.3 },
  portal: { ...base, speed: 30, curl: 0.01, alpha: 0.4, fov: 64, zoom: 1.1, focus: 0 },
  droplet: { ...base, speed: 15, curl: 0.01, chaos: 4, alpha: 0.1, fov: 82, zoom: 2.7, focus: 0.18 },
};

export const defaultChaosOptions: ChaosOptions = base;
