//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (10s): Orbit a 3D scene.
 *
 * @mdl packages/plugins/plugin-spacetime/PLUGIN.mdl test QA-3
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/docs/SHOWCASE.md.
 */

import { SHORT_MS, create, orbit, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = SHORT_MS;

export const steps = showcase({
  name: 'spacetime',
  caption: 'Orbit a 3D scene.',
  plugins: ['spacetime'],
  ms: CLIP_MS,
  setup: ({ page }) => create(page, 'spacetime.scene'),
  clip: ({ page }) => orbit(page, { dx: 800, dy: 180, ms: 8_000 }),
});
