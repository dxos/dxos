//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (10s): Spin a generated planet.
 *
 * @mdl packages/plugins/plugin-terra/PLUGIN.mdl test QA-3
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/docs/SHOWCASE.md.
 */

import { SHORT_MS, create, orbit, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = SHORT_MS;

export const steps = showcase({
  name: 'terra',
  caption: 'Spin a generated planet.',
  plugins: ['terra'],
  ms: CLIP_MS,
  setup: ({ page }) => create(page, 'terra'),
  clip: ({ page }) => orbit(page, { dx: 900, dy: 150, ms: 8_000 }),
});
