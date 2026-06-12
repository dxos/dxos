//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.crx'),
  name: 'Browser Extension',
  author: 'DXOS',
  description: trim`
    Capture content from any web page into your workspace with the Composer browser extension.
    Highlight a section of a page and save it as a contact, an organization, or a bookmark — 
    the page's title, images, and details are picked up automatically, so a profile page 
    becomes a ready-made Person card and an article becomes a note with its source and text already filled in.

    Saved items land in your active space alongside everything else you're working on, 
    complete with a link back to the original page.
  `,
  icon: 'ph--browser--regular',
  iconHue: 'orange',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-crx',
  // screenshots: [
  //   'https://raw.githubusercontent.com/dxos/dxos/refs/heads/main/packages/plugins/plugin-crx/assets/images/',
  // ],
  spec: 'PLUGIN.mdl',
  tags: ['labs'],
});
