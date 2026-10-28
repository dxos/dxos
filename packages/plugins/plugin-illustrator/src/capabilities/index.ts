//
// Copyright 2026 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppActivationEvents from '@dxos/app-toolkit/AppActivationEvents';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { meta } from '#meta';
import { translations } from '#translations';
import { IllustratorCapabilities, IllustratorEvents } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'), {
  environments: ['browser', 'node', 'tauri'],
});
export const Commands = AppCapability.commands(() => import('./commands.ts'));
export const CommentConfig = AppCapability.commentConfig(() => import('./comment-config.ts'), {
  activatesOn: IllustratorEvents.Start,
});
// Browser-only: the entry supplies `CreateDrawingPanel`, the React form that picks the drawing
// variant and collects its input.
export const CreateObject = SpaceCapability.createObject(() => import('./create-object.ts'), {
  environments: ['browser', 'tauri'],
});
// Migration providers stay eager: a migration missing when a space opens is a data hazard.
export const Migrations = Capability.lazyModule(
  'IllustratorMigrations',
  { provides: [ClientCapabilities.Migration] },
  () => import('./migrations.ts'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.cardContent', 'org.dxos.role.section', 'org.dxos.role.slide'],
});
export const RefitState = Capability.lazyModule(
  'RefitState',
  { provides: [IllustratorCapabilities.Refit], activatesOn: ActivationEvents.Startup },
  () => import('./refit-state.ts'),
);
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'));
export const SvgVariant = Capability.lazyModule(
  'IllustratorSvgVariant',
  {
    provides: [IllustratorCapabilities.VariantProvider],
    activatesOn: ActivationEvent.oneOf(IllustratorEvents.Start, AppActivationEvents.AssistantStart),
  },
  () => import('#svg-variant'),
);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: () => import('../../PLUGIN.mdl?raw'),
  mimeType: 'application/x-mdl',
});
export const Translations = AppCapability.translations(translations, {
  environments: ['browser', 'node', 'tauri'],
});
