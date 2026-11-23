//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (10s): Pan a graph of the space.
 *
 * @mdl packages/plugins/plugin-explorer/PLUGIN.mdl test QA-2
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/docs/SHOWCASE.md.
 */

import { SHORT_MS, create, orbit, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = SHORT_MS;

export const steps = showcase({
  name: 'explorer',
  caption: 'Pan a graph of the space.',
  plugins: ['explorer'],
  ms: CLIP_MS,
  setup: ({ page }) => create(page, 'graph', { name: 'Graph' }),
  clip: ({ page }) => orbit(page, { dx: 300, dy: 250, ms: 6_000 }),
});
