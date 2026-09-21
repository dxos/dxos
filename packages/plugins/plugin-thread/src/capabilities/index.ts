//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { translations as threadTranslations } from '@dxos/react-ui-thread/translations';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

// The graph builder reads the call manager OPTIONALLY (reactive atom with an absence guard),
// so no spec-level require: a hard cross-plugin require would fail this plugin whenever
// plugin-calls is disabled. Cross-feature requires are only valid with a plugin-level dependsOn.
export { ThreadAppGraphBuilder as AppGraphBuilder } from './app-graph-builder.ts';
export { ChannelBackendFeed } from './channel-backend-feed.ts';
// `CreateObjectEntry` carries a `customPanel` React component alongside the object factory, so it
// cannot load without React — browser only.
export { CreateObject } from './create-object.ts';
export { OperationHandler } from './operation-handler.ts';
export { ReactSurface } from './react-surface.ts';
export { Schema } from './schema.ts';
export const Translations = AppCapability.translations([...translations, ...threadTranslations]);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
