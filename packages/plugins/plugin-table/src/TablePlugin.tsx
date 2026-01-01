//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, Plugin } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';
import { type CreateObject } from '@dxos/plugin-space/types';
import { translations as formTranslations } from '@dxos/react-ui-form';
import { translations as tableTranslations } from '@dxos/react-ui-table';
import { Table } from '@dxos/react-ui-table/types';

import { BlueprintDefinition, IntentResolver, OperationResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { CreateTableSchema, TableOperation } from './types';

export const TablePlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations: [...translations, ...formTranslations, ...tableTranslations] }),
  Common.Plugin.addMetadataModule({
    metadata: {
      id: Type.getTypename(Table.Table),
      metadata: {
        icon: 'ph--table--regular',
        iconHue: 'green',
        comments: 'unanchored',
        inputSchema: CreateTableSchema,
        createObject: ((props) => Effect.sync(() => Table.make(props))) satisfies CreateObject,
      },
    },
  }),
  Common.Plugin.addSchemaModule({ schema: [Table.Table] }),
  Plugin.addModule({
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    activate: (context) =>
      Effect.succeed(
        Capability.contributes(SpaceCapabilities.OnCreateSpace, (params) => {
          const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
          return invoke(TableOperation.OnCreateSpace, params);
        }),
      ),
  }),
  Plugin.addModule({
    id: 'on-schema-added',
    activatesOn: SpaceEvents.SchemaAdded,
    activate: (context) =>
      Effect.succeed(
        Capability.contributes(SpaceCapabilities.OnSchemaAdded, ({ db, schema, show }) => {
          const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
          return invoke(TableOperation.OnSchemaAdded, { db, schema, show });
        }),
      ),
  }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Common.Plugin.addOperationResolverModule({ activate: OperationResolver }),
  Common.Plugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  Plugin.make,
);
