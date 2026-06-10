//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.extension'),
  name: 'Browser Extension',
  author: 'DXOS',
  description: trim`
    Browser Extension exposes user settings for the composer-crx browser extension. 
    The extension can both clip DOM subtrees into Composer and act as a search render-proxy — 
    fetching and JS-rendering pages in a real browser tab so plugins (e.g., product search)
    can scrape client-rendered or anti-bot sites a plain HTTP proxy cannot read.

    The settings surface contributes toggles and values that govern the render-proxy: 
    a master switch that lets plugins use the extension to render pages, the per-render timeout, 
    whether to render in a focused tab (some sites defer loading when backgrounded), 
    and a developer-mode flag that enables verbose logging and debug previews. 
    Settings are persisted to the app-framework settings store and exposed to other plugins via a plugin-scoped capability.
  `,
  icon: 'ph--puzzle-piece--regular',
  iconHue: 'indigo',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-extension',
  spec: 'PLUGIN.mdl',
  tags: ['labs'],
});
