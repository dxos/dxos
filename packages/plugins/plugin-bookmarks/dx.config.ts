//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.bookmarks',
    name: 'Bookmarks',
    description: trim`
      Save web pages you want to come back to. Add a bookmark from any page with one click in the
      Composer browser extension — the page's title, image, and description are captured
      automatically, and each bookmark keeps a link back to the original page.

      Bookmarks live in your space alongside everything else, ready to organize into collections,
      open from search, or summarize later.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-bookmarks',
    icon: { key: 'ph--bookmark-simple--regular', hue: 'amber' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
});
