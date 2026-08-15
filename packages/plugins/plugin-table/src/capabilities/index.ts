//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as Operation from '@dxos/compute/Operation';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import * as SpaceEvents from '@dxos/plugin-space/SpaceEvents';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { translations as tableTranslations } from '@dxos/react-ui-table/translations';

import { meta } from '#meta';
import { translations } from '#translations';
import { TableEvents, TableOperation } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const Schema = AppCapability.schema(() => import('./schema'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'), {
  environments: ['node'],
});
export const CommentConfig = AppCapability.commentConfig(() => import('./comment-config'), {
  activatesOn: TableEvents.Start,
  environments: ['node'],
});
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'), {
  environments: ['node'],
});
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.cardContent', 'org.dxos.role.section', 'org.dxos.role.slide'],
});

// Genuine runtime event: fires whenever a new type is added to a space, not at startup.
export const OnTypeAdded = Capability.inlineModule(
  'on-type-added',
  { provides: [SpaceCapabilities.OnTypeAdded], activatesOn: SpaceEvents.TypeAdded },
  () =>
    Effect.succeed([
      Capability.contribute(SpaceCapabilities.OnTypeAdded, ({ db, type, show }) =>
        Operation.invoke(TableOperation.OnTypeAdded, { db, type, show }),
      ),
    ]),
);
export const Translations = AppCapability.translations([...translations, ...formTranslations, ...tableTranslations]);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
