//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppCapabilities, AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { SpaceCapabilities, SpaceEvents, type CreateObject } from '@dxos/plugin-space/types';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { translations as tableTranslations } from '@dxos/react-ui-table/translations';
import { Table } from '@dxos/react-ui-table/types';
import { ViewModel } from '@dxos/schema';

import { BlueprintDefinition, OperationHandler, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { CreateTableSchema, TableOperation } from '#operations';
import { translations } from '#translations';

export const TablePlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  Plugin.addModule({
    id: 'create-object',
    activatesOn: AppActivationEvents.SetupMetadata,
    activate: Effect.fnUntraced(function* () {
      return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Table.Table.typename,
        inputSchema: CreateTableSchema,
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = yield* Effect.promise(async () => {
              const { view, jsonSchema } = await ViewModel.makeFromDatabase({
                db: options.db,
                typename: props.typename,
              });
              return Table.make({ name: props.name, view, jsonSchema });
            });
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          })) satisfies CreateObject,
      });
    }),
  }),
  Plugin.addModule({
    id: 'comment-config',
    activatesOn: AppActivationEvents.SetupMetadata,
    activate: Effect.fnUntraced(function* () {
      return Capability.contributes(AppCapabilities.CommentConfig, {
        id: Table.Table.typename,
        comments: 'unanchored',
      } satisfies AppCapabilities.CommentConfig);
    }),
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Table.Table] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({
    translations: [...translations, ...formTranslations, ...tableTranslations],
  }),
  Plugin.addModule({
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    activate: () =>
      Effect.succeed(
        Capability.contributes(SpaceCapabilities.OnCreateSpace, (params) =>
          Operation.invoke(TableOperation.OnCreateSpace, params),
        ),
      ),
  }),
  Plugin.addModule({
    id: 'on-schema-added',
    activatesOn: SpaceEvents.SchemaAdded,
    activate: () =>
      Effect.succeed(
        Capability.contributes(SpaceCapabilities.OnSchemaAdded, ({ db, schema, show }) =>
          Operation.invoke(TableOperation.OnSchemaAdded, { db, schema, show }),
        ),
      ),
  }),
  Plugin.make,
);

export default TablePlugin;
