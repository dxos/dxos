//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { BookmarksNamespace } from './src/namespace.ts';

// #region config
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: BookmarksNamespace.key,
    name: 'Bookmarks',
    author: 'Example',
    description: 'Save links in a space and count how often each one is opened.',
    icon: { key: 'ph--bookmark-simple--regular', hue: 'amber' },
    tags: ['labs'],
  },
  modules: [
    // #endregion
    // #region translations
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
    // #endregion
    // #region schema
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    SpaceCapability.createObject(() => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } })),
    // #endregion
    // #region surface
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [AppSurface.Article],
    }),
    // #endregion
    // #region operation
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    // #endregion
    // #region app-graph
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    // #endregion
    // #region end
  ],
});

export const { meta, make } = config;

export default config;
// #endregion
