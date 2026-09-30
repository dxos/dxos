//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { meta } from '#meta';
import { translations } from '#translations';
import { SandboxCapabilities } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const SandboxLayer = AppCapability.layerSpec(() => import('./sandbox-service.ts'), { name: 'SandboxLayer' });
export const LocalLauncher = Capability.lazyModule(
  'LocalLauncher',
  { provides: [SandboxCapabilities.LocalLauncher], activatesOn: ActivationEvents.Startup, environments: ['tauri'] },
  () => import('./local-launcher.ts'),
);
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const Settings = AppCapability.settings(() => import('./settings.ts'), {
  provides: [SandboxCapabilities.Settings],
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const CreateObject = SpaceCapability.createObject(() => import('./create-object.ts'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.section'],
});
export const Translations = AppCapability.translations(translations);
