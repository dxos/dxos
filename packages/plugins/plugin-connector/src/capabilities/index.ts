//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export * from './connector-coordinator/index.ts';

export { ConnectorAppGraphBuilder as AppGraphBuilder } from './app-graph-builder.ts';
export { BuiltinConnectors } from './connectors.ts';
// `#commands` resolves to `commands.browser.ts` under the browser: `connector oauth` needs a Bun
// callback server, so only headless runtimes get the real command graph.
export const Commands = AppCapability.lazyCommands(() => import('#commands'));
export { CreateObject } from './create-object.ts';
export { OAuthRedirect } from './oauth-redirect.ts';
export { OperationHandler } from './operation-handler.ts';
export { RoutineTemplate } from './routine-template.ts';
export { ReactSurface } from './react-surface.ts';
export { Schema } from './schema.ts';
export { SkillDefinition } from './skill-definition.ts';
export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
