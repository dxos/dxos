//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.masonry'),
  name: 'Masonry',
  author: 'DXOS',
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
  icon: 'ph--wall--regular',
  iconHue: 'teal',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-masonry',
  spec: 'PLUGIN.mdl',
  screenshots: [],
});
