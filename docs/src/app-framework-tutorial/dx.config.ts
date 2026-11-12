//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { StashNamespace } from './src/namespace.ts';

// #region config
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: StashNamespace.key,
    name: 'Stash',
    author: 'Example',
    description:
      'A reading list: save links with a note, and mark them as read.',
    icon: { key: 'ph--tray-arrow-down--regular', hue: 'indigo' },
    tags: ['labs'],
  },
  modules: [
    // #region translations
    AppCapability.translations(
      () => import('./src/translations.ts', { with: { type: 'module-url' } }),
    ),
    // #endregion
    // #region schema
    AppCapability.schema(
      () =>
        import('./src/capabilities/schema.ts', {
          with: { type: 'module-url' },
        }),
    ),
    // #endregion
    // #region operation
    AppCapability.operationHandler(
      () =>
        import('./src/capabilities/operation-handler.ts', {
          with: { type: 'module-url' },
        }),
    ),
    SpaceCapability.createObject(
      () =>
        import('./src/capabilities/create-object.ts', {
          with: { type: 'module-url' },
        }),
    ),
    // #endregion
    // #region app-graph
    AppCapability.appGraphBuilder(
      () =>
        import('./src/capabilities/app-graph-builder.ts', {
          with: { type: 'module-url' },
        }),
    ),
    // #endregion
    // #region surface
    AppCapability.surface(
      () =>
        import('./src/capabilities/react-surface.ts', {
          with: { type: 'module-url' },
        }),
      {
        roles: [AppSurface.Article],
      },
    ),
    // #endregion
    // #region skill
    AppCapability.skillDefinition(
      () =>
        import('./src/capabilities/skill-definition.ts', {
          with: { type: 'module-url' },
        }),
    ),
    // #endregion
  ],
});

export const { meta, make } = config;

export default config;
// #endregion
