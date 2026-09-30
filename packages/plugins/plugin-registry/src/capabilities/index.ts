//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { translations } from '#translations';
import { RegistryCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'));
export const DevPluginLoader = Capability.lazyModule(
  'DevPluginLoader',
  { requires: [Capabilities.PluginManager, Capabilities.AtomRegistry, RegistryCapabilities.Settings], provides: [] },
  () => import('./dev-plugin-loader.ts'),
);
export const Commands = AppCapability.commands(() => import('#commands'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.dialog'],
});
export const RegistrySettings = AppCapability.settings(() => import('./settings.ts'), {
  provides: [RegistryCapabilities.Settings],
});
export const Translations = AppCapability.translations(translations);
