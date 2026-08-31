//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { meta } from '#meta';
import { translations } from '#translations';
import { IllustratorCapabilities, IllustratorEvents } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const CommentConfig = AppCapability.commentConfig(() => import('./comment-config'), {
  activatesOn: IllustratorEvents.Start,
});
// Browser-only: the entry supplies `CreateDrawingPanel`, the React form that picks the drawing
// variant and collects its input.
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'), {
  environments: [],
});
// Migration providers stay eager: a migration missing when a space opens is a data hazard.
export const Migrations = Capability.lazyModule(
  'IllustratorMigrations',
  { provides: [ClientCapabilities.Migration] },
  () => import('./migrations'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
  environments: ['node'],
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.cardContent', 'org.dxos.role.section', 'org.dxos.role.slide'],
});
export const Schema = AppCapability.schema(() => import('./schema'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'), {
  environments: ['node'],
});
// Browser-only: the variant supplies the React article/card components that render a drawing.
export const SvgVariant = Capability.lazyModule(
  'IllustratorSvgVariant',
  { provides: [IllustratorCapabilities.VariantProvider], activatesOn: IllustratorEvents.Start, environments: [] },
  () => import('./svg-variant'),
);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const Translations = AppCapability.translations(translations, {
  environments: ['node'],
});
