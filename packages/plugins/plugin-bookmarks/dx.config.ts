//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as CrxCapabilities from '@dxos/plugin-crx/CrxCapabilities';
import * as CrxEvents from '@dxos/plugin-crx/CrxEvents';
import { trim } from '@dxos/util';

import { BookmarksNamespace } from './src/namespace.ts';
import * as BookmarksEvents from './src/types/BookmarksEvents.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: BookmarksNamespace.key,
    name: 'Bookmarks',
    author: 'DXOS',
    description: trim`
      Save web pages you want to come back to. Add a bookmark from any page with one click in the
      Composer browser extension - the page's title, image, and description are captured
      automatically, and each bookmark keeps a link back to the original page.

      Bookmarks live in your space alongside everything else, ready to organize into collections,
      open from search, or summarize later.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-bookmarks',
    icon: { key: 'ph--bookmark-simple--regular', hue: 'amber' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
  modules: [
    AppCapability.commentConfig(
      () => import('./src/capabilities/comment-config.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: BookmarksEvents.Start,
      },
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      { activatesOn: ActivationEvents.Idle },
    ),
    Capability.lazyModule(
      'PageActionProvider',
      { provides: [CrxCapabilities.PageAction], activatesOn: CrxEvents.Start },
      () => import('./src/capabilities/page-action.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'plugin-asset',
      {
        activatesOn: ActivationEvents.PluginAssetsRequested,
        provides: [AppCapabilities.PluginAsset],
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/plugin-asset.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article', 'org.dxos.role.cardContent'],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    Capability.lazyModule(
      'translations',
      { provides: [AppCapabilities.Translations], environments: ['browser', 'node', 'tauri', 'workerd'] },
      () => import('./src/capabilities/translations.ts', { with: { type: 'module-url' } }),
    ),
  ],
});

export const { meta, make } = config;

export default config;
