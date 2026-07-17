//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { translations as tableTranslations } from '@dxos/react-ui-table/translations';
import { Table } from '@dxos/react-ui-table/types';

import { CommentConfig, CreateObject, OperationHandler, ReactSurface, SkillDefinition } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { TableOperation } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const TablePlugin = Plugin.define(meta).pipe(
  AppPlugin.addSkillDefinitionModule({
    requires: SkillDefinition.requires,
    provides: SkillDefinition.provides,
    activate: SkillDefinition,
  }),
  AppPlugin.addCommentConfigModule({
    requires: CommentConfig.requires,
    provides: CommentConfig.provides,
    activate: CommentConfig,
  }),
  AppPlugin.addCreateObjectModule({
    requires: CreateObject.requires,
    provides: CreateObject.provides,
    activate: CreateObject,
  }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSchemaModule({ schema: [Table.Table] }),
  AppPlugin.addSurfaceModule({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule({
    translations: [...translations, ...formTranslations, ...tableTranslations],
  }),
  // Genuine runtime event: fires whenever a new type is added to a space, not at startup.
  Plugin.addModule({
    id: 'on-type-added',
    activatesOn: SpaceEvents.TypeAdded,
    requires: [],
    provides: [SpaceCapabilities.OnTypeAdded],
    activate: () =>
      Effect.succeed([
        Capability.provide(SpaceCapabilities.OnTypeAdded, ({ db, type, show }) =>
          Operation.invoke(TableOperation.OnTypeAdded, { db, type, show }),
        ),
      ]),
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default TablePlugin;
