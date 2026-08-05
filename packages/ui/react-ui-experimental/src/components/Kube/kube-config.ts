//
// Copyright 2020 DXOS.org
//

// Kept out of `Kube.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

export const defaultConfig = {
  radius: 800,
  minDistance: 150,
  particleCount: 400,
  maxParticleCount: 600,
  maxConnections: 20, // Only honoured when `limitConnections` is true (see `animate`).
  limitConnections: false,
  showLines: true,
  velocityX: 0.1,
  velocityY: 0.1,
  velocityZ: 0.1,
};
