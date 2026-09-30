//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Type } from '@dxos/echo';

import { meta } from '#meta';
import { Sandbox, SandboxCapabilities } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'));
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
// Names the type where the navtree lists it; without it the Database section shows the raw typename.
export const Translations = AppCapability.translations([
  {
    'en-US': {
      [Type.getTypename(Sandbox.Sandbox)]: {
        'typename.label': 'Sandbox',
        'typename.label_zero': 'Sandboxes',
        'typename.label_one': 'Sandbox',
        'typename.label_other': 'Sandboxes',
      },
    },
  },
]);
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
