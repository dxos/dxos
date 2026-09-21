//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as Operation from '@dxos/compute/Operation';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceEvents from '@dxos/plugin-space/SpaceEvents';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { translations as tableTranslations } from '@dxos/react-ui-table/translations';

import { meta } from '#meta';
import { translations } from '#translations';
import { TableOperation } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export { Schema } from './schema.ts';
export { SkillDefinition } from './skill-definition.ts';
export { CommentConfig } from './comment-config.ts';
export { CreateObject } from './create-object.ts';
export { OperationHandler } from './operation-handler.ts';
export { ReactSurface } from './react-surface.ts';

// Genuine runtime event: fires whenever a new type is added to a space, not at startup.
export const OnTypeAdded = Capability.makeModule(
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
