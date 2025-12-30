//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, Plugin, createIntent } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';
import { translations as formTranslations } from '@dxos/react-ui-form';
import { translations as tableTranslations } from '@dxos/react-ui-table';
import { Table } from '@dxos/react-ui-table/types';

import { BlueprintDefinition, IntentResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { CreateTableSchema, TableAction } from './types';

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
        createObjectIntent: ((props, options) =>
          createIntent(TableAction.Create, { ...props, space: options.db })) satisfies CreateObjectIntent,
      },
    },
  }),
  Common.Plugin.addSchemaModule({ schema: [Table.Table] }),
  Plugin.addModule({
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    activate: () =>
      Effect.succeed(
        Capability.contributes(SpaceCapabilities.OnCreateSpace, (params) =>
          createIntent(TableAction.OnCreateSpace, params),
        ),
      ),
  }),
  Plugin.addModule({
    id: 'on-schema-added',
    activatesOn: SpaceEvents.SchemaAdded,
    activate: () =>
      Effect.succeed(
        Capability.contributes(SpaceCapabilities.OnSchemaAdded, ({ db, schema, show }) =>
          createIntent(TableAction.OnSchemaAdded, { db, schema, show }),
        ),
      ),
  }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Common.Plugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  Plugin.make,
);
