//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.game',
    name: 'Game',
    description: trim`
      Generic game host plugin that provides shared infrastructure for local-first,
      multi-player turn-based games inside DXOS Composer. The plugin owns the base
      \`Game\` ECHO type — which stores players and a reference to variant-specific
      state — and drives the two-stage game-creation flow (variant picker + optional
      input form).

      Game variants (chess, tic-tac-toe, and others) are contributed by separate
      plugins via the \`GameCapabilities.VariantProvider\` capability. Each variant supplies
      its own state schema, player roles, create factory, and surface components
      (Article and Card). Plugin-game resolves the correct variant at runtime and
      delegates rendering, keeping the host layer fully decoupled from game logic.

      Variant state objects are stored as hidden ECHO objects alongside the top-level
      \`Game\`, ensuring they replicate to all peers but do not appear as independent
      items in the user's space graph. The entire creation flow is atomic: if the
      Game write fails, the variant state is rolled back automatically.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-game',
    icon: { key: 'ph--sword--regular', hue: 'indigo' },
    spec: 'PLUGIN.mdl',
    screenshots: [
      { dark: 'https://customer-5rxcjpyab08avpmn.cloudflarestream.com/2797d56edc9658d018ad75fe48a47f27/iframe?poster=https%3A%2F%2Fcustomer-5rxcjpyab08avpmn.cloudflarestream.com%2F2797d56edc9658d018ad75fe48a47f27%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600' },
    ],
  },
});
