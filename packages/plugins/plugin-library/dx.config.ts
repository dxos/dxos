//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { LibraryNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: LibraryNamespace.key,
    name: 'Library',
    author: 'DXOS',
    description: trim`
    Library is a personal reading list built on ECHO. Each book is an ECHO object with a public,
    catalog-eligible face (title, authors, reading status, rating, review) and a private face that
    never leaves the space (notes, ownership, personal tags).

    Books are created with a type-ahead backed by BookHive's public catalog, which resolves a title
    to its authors, cover, and genres. The public face of a book carries an atproto record annotation,
    so the generic atproto companion can publish it as a buzz.bookhive.book record on the user's PDS —
    a concrete demonstration of the ECHO ↔ atproto publishing model.
  `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-library',
    icon: { key: 'ph--book-open--regular', hue: 'amber' },
    spec: 'PLUGIN.mdl',
    screenshots: [],
    tags: ['labs'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    SpaceCapability.createObject(() => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } })),
    AppCapability.pluginAsset({
      pluginId: LibraryNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [AppRole.Article, AppRole.CardContent],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
