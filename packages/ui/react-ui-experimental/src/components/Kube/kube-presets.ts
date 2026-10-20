//
// Copyright 2020 DXOS.org
//

import { type KubeOptions } from './kube-scene.ts';

// Kept out of `Kube.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

export const defaultKubeOptions: KubeOptions = {
  particles: 160,
  distance: 0.4,
  speed: 0.4,
  reaction: 1,
  rotation: 0.1,
  color: '#5b8cff',
  speakingColor: '#2ecc71',
};

export const kubePresets: Record<string, KubeOptions> = {
  sparse: { ...defaultKubeOptions, particles: 80, distance: 0.55, speed: 0.3, reaction: 1.5 },
  dense: { ...defaultKubeOptions, particles: 280, distance: 0.3, speed: 0.5, reaction: 0.8 },
};
