//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Type } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';
import { type CreateObject } from '@dxos/plugin-space/types';
import { translations as formTranslations } from '@dxos/react-ui-form';
import { translations as tableTranslations } from '@dxos/react-ui-table';
import { Table } from '@dxos/react-ui-table/types';
import { View } from '@dxos/schema';

import { BlueprintDefinition, OperationResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { CreateTableSchema, TableOperation } from './types';

export const TablePlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addMetadataModule({
    metadata: {
      id: Type.getTypename(Table.Table),
      metadata: {
        icon: 'ph--table--regular',
        iconHue: 'green',
        comments: 'unanchored',
        inputSchema: CreateTableSchema,
        createObject: ((props, { db }) =>
          Effect.promise(async () => {
            const { view, jsonSchema } = await View.makeFromDatabase({ db, typename: props.typename });
            return Table.make({ name: props.name, view, jsonSchema });
          })) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSchemaModule({ schema: [Table.Table] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations: [...translations, ...formTranslations, ...tableTranslations] }),
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
