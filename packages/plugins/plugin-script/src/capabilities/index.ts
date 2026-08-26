//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { meta } from '#meta';
import { translations } from '#translations';
import { ScriptCapabilities, ScriptEvents } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  environments: ['node'],
});
export const Schema = AppCapability.schema(() => import('./schema'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'), {
  environments: ['node'],
});
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'), {
  environments: ['node'],
});
export const Compiler = Capability.lazyModule(
  'Compiler',
  {
    provides: [ScriptCapabilities.Compiler],
    // Genuine runtime event: the compiler is only loaded on demand (`hooks/useCompiler.ts`), not at startup.
    activatesOn: ScriptEvents.SetupCompiler,
  },
  () => import('./compiler'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.dialog', 'org.dxos.role.objectProperties', 'org.dxos.role.section'],
});
export const ScriptSettings = AppCapability.settings(() => import('./settings'), {
  activatesOn: ActivationEvents.Idle,
  provides: [ScriptCapabilities.Settings],
});
export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
