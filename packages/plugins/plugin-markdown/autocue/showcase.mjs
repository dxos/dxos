//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (20s): Write a short formatted document: a heading, emphasis, a list, a checklist and a link.
 *
 * @mdl packages/plugins/plugin-markdown/PLUGIN.mdl test QA-5
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `packages/apps/composer-app/autocue/showcase/overnight.mjs`; rules in GridZoom/SHOWCASE.md.
 */

import { LONG_MS, create, editor, showcase, type } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = LONG_MS;

export const steps = showcase({
  name: 'markdown',
  caption: 'Write a short formatted document: a heading, emphasis, a list, a checklist and a link.',
  plugins: ['markdown'],
  ms: CLIP_MS,
  setup: ({ page }) => create(page, 'document'),
  clip: async ({ page }) => {
    await editor(page).click();
    // The editor continues a list on Enter, so only each list's first item types its own marker.
    await type(
      page,
      '# Field notes\n\nLocal-first apps keep **your data** on your device, and _sync_ when you are back online.\n\n' +
        '- Works offline\nSyncs peer to peer\nAgents work alongside you\n\n\n- [ ] Draft the launch post\nRecord the demo\n\n',
      28,
    );
  },
});
