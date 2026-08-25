//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';
import * as RoutineEvents from '@dxos/plugin-routine/RoutineEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [AttentionCapabilities.ViewState],
});
export const RoutineTemplates = Capability.lazyModule(
  'RoutineTemplates',
  { provides: [RoutineCapabilities.Template], activatesOn: RoutineEvents.Start },
  () => import('./routine-templates'),
);
export const Schema = AppCapability.schema(() => import('./schema'));
// Startup rather than the default dependency-mode gate: the consumers read the capability set
// (`capabilities.getAll`) instead of declaring it as a requirement, so nothing would ever demand it
// and a Post would stay unreadable — no reading companion, no extraction.
export const TextContent = AppCapability.textContent(() => import('./text-content'), {
  activatesOn: ActivationEvents.Startup,
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.cardContent', 'org.dxos.role.objectProperties'],
});
export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
