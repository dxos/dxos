//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.crx'),
  name: 'CRX',
  author: 'DXOS',
  description: trim`
    Capture content from any web page into your workspace with the Composer browser extension.
    Highlight a section of a page and save it as a contact, an organization, or a note — the page's
    title, images, and details are picked up automatically, so a profile page becomes a ready-made
    Person card and an article becomes a note with its source and text already filled in.

    Saved items land in your active space alongside everything else you're working on, complete
    with a link back to the original page. If something can't be saved, the extension tells you
    exactly why so you can try again.

    Settings cover how the extension and Composer work together: extension actions, whether Composer
    jumps straight to a newly saved item, loading pages in the background — with an adjustable time
    limit and an option to use a visible tab instead — and a developer mode for troubleshooting.
    A connection test confirms the extension is installed and reachable.
  `,
  icon: 'ph--browser--regular',
  iconHue: 'neutral',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-crx',
  spec: 'PLUGIN.mdl',
  tags: ['system'],
});
