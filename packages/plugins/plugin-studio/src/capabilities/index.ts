//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object.ts'));
export const NavigationTargetResolver = AppCapability.navigationResolver(
  () => import('./navigation-target-resolver.ts'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.plugin.studio.role.variantRenderer', 'org.dxos.role.article', 'org.dxos.role.cardContent'],
});
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const Translations = AppCapability.translations(translations);
