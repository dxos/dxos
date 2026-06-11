//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.bookmarks'),
  name: 'Bookmarks',
  author: 'DXOS',
  description: trim`
    Save web pages you want to come back to. Add a bookmark from any page with one click in the
    Composer browser extension — the page's title, image, and description are captured
    automatically, and each bookmark keeps a link back to the original page.

    Bookmarks live in your space alongside everything else, ready to organize into collections,
    open from search, or summarize later.
  `,
  icon: 'ph--bookmark-simple--regular',
  iconHue: 'amber',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-bookmarks',
  spec: 'PLUGIN.mdl',
  tags: ['labs'],
});
