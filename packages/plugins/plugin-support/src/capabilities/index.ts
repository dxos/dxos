//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { meta } from '#meta';
import { translations } from '#translations';
import { HelpCapabilities, SupportCapabilities, Tour } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [SupportCapabilities.Settings],
});
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const Schema = AppCapability.schema(() => import('./schema'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const HelpState = Capability.lazyModule(
  'HelpState',
  { provides: [HelpCapabilities.State] },
  () => import('./help-state'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactRoot = AppCapability.reactRoot(() => import('./react-root'), {
  /** Maps the plugin's configured tour-step loader to the body's props. */
  props: (options: { helpSteps?: () => Promise<Tour.Step[]> }) => options.helpSteps,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: [
    'org.dxos.plugin.space.role.homeContent',
    'org.dxos.plugin.support.role.hints',
    'org.dxos.plugin.support.role.keyshortcuts',
    'org.dxos.role.article',
    'org.dxos.role.deckCompanion.discord',
    'org.dxos.role.deckCompanion.help',
    'org.dxos.role.dialog',
    'org.dxos.role.section',
    'org.dxos.role.statusIndicator',
  ],
});
export const SupportSettings = AppCapability.settings(() => import('./settings'), {
  provides: [SupportCapabilities.Settings],
});
export const Translations = AppCapability.translations(translations);
