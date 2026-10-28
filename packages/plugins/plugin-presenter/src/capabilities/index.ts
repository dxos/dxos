//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { meta } from '#meta';
import { translations } from '#translations';
import { PresenterCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'), {
  environments: ['browser', 'node', 'tauri'],
});
export const CreateObject = SpaceCapability.createObject(() => import('./create-object.ts'), {
  environments: ['browser', 'node', 'tauri'],
});
export const MarkdownExtension = Capability.lazyModule(
  'MarkdownExtension',
  { provides: [MarkdownCapabilities.ExtensionProvider], activatesOn: MarkdownEvents.Start },
  () => import('./markdown-extension.ts'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
// Migration providers stay eager: a migration missing when a space opens is a data hazard.
export const Migrations = Capability.lazyModule(
  'PresenterMigrations',
  { provides: [ClientCapabilities.Migration] },
  () => import('./migrations.ts'),
);
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.objectProperties', 'org.dxos.role.slide'],
});
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const Settings = AppCapability.settings(() => import('./settings.ts'), {
  provides: [PresenterCapabilities.Settings],
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'));
export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: () => import('../../PLUGIN.mdl?raw'),
  mimeType: 'application/x-mdl',
});
