//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { trim } from '@dxos/util';

import { CrxNamespace } from './src/namespace.ts';
import * as CrxCapabilities from './src/types/CrxCapabilities.ts';
import * as CrxEvents from './src/types/CrxEvents.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: CrxNamespace.key,
    name: 'Browser Extension',
    author: 'DXOS',
    description: trim`
      Capture content from any web page into your workspace with the Composer browser extension.
      Highlight a section of a page and save it as a contact, an organization, or a bookmark -
      the page's title, images, and details are picked up automatically, so a profile page
      becomes a ready-made Person card and an article becomes a note with its source and text already filled in.

      Saved items land in your active space alongside everything else you're working on,
      complete with a link back to the original page.

      Install the browser extension from the [Chrome Web Store](https://chromewebstore.google.com/detail/composer/ahkmmpagcinoehpnmdhoiohmmbikhnmj?pli=1).
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-crx',
    icon: { key: 'ph--puzzle-piece--regular', hue: 'orange' },
    // screenshots: [
    //   { dark: 'https://raw.githubusercontent.com/dxos/dxos/refs/heads/main/packages/plugins/plugin-crx/assets/images/' },
    // ],
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
  modules: [
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      activatesOn: ActivationEvents.Idle,
      provides: [CrxCapabilities.Settings],
    }),
    Capability.lazyModule(
      'InstallPageActions',
      {
        requires: [Capabilities.OperationInvoker, Capabilities.AtomRegistry, CrxCapabilities.Settings],
        provides: [],
        activatesOn: CrxEvents.Start,
      },
      () => import('./src/capabilities/install-page-actions.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    Capability.lazyModule(
      'PageActionProvider',
      { provides: [CrxCapabilities.PageAction], activatesOn: CrxEvents.Start },
      () => import('./src/capabilities/page-action-provider.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.pluginAsset({
      pluginId: CrxNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article'],
    }),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
