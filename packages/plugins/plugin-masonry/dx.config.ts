//
// Copyright 2025 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.masonry',
    name: 'Masonry',
    description: trim`
    Masonry renders a live, query-driven collection as a responsive column-balanced card grid.

    A Masonry object wraps an ECHO View that defines which objects to show and in what order.
    As objects are added or removed — by any peer — the grid reflows automatically, keeping cards
    balanced across columns without manual arrangement.

    Each card delegates its body to a Surface slot, so other plugins can supply rich, type-specific
    content while Masonry handles layout, search, and context menus.

    A built-in search bar filters cards client-side by label without modifying the underlying query,
    making it easy to explore large collections without leaving the view.
  `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-masonry',
    icon: { key: 'ph--wall--regular', hue: 'teal' },
    spec: 'PLUGIN.mdl',
    screenshots: [],
  },
});
