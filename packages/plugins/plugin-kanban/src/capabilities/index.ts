//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { meta } from '#meta';
import { translations } from '#translations';
import { KanbanEvents } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'), {
  environments: ['node'],
});
export const CreateObject = SpaceCapability.createObject(() => import('./create-object.ts'), {
  environments: ['node'],
});
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: [
    'org.dxos.role.article',
    'org.dxos.role.formInput',
    'org.dxos.role.objectProperties',
    'org.dxos.role.section',
  ],
});
export const UndoMappings = AppCapability.undoMappings(() => import('./undo-mappings.ts'), {
  activatesOn: KanbanEvents.Start,
  environments: ['node'],
});
export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
