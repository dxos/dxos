//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (10s): Orbit a voxel world.
 *
 * @mdl packages/plugins/plugin-voxel/PLUGIN.mdl test QA-2
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/docs/SHOWCASE.md.
 */

import { SHORT_MS, create, orbit, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = SHORT_MS;

export const steps = showcase({
  name: 'voxel',
  caption: 'Orbit a voxel world.',
  plugins: ['voxel'],
  ms: CLIP_MS,
  setup: ({ page }) => create(page, 'voxel'),
  clip: ({ page }) => orbit(page, { dx: 800, dy: 180, ms: 8_000 }),
});
