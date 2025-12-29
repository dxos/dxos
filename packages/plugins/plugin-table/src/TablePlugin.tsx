//
// Copyright 2025 DXOS.org
//

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
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () => Capability.contributes(ClientCapabilities.Schema, [Table.Table]),
  }),
  Plugin.addModule({
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    activate: () =>
      Capability.contributes(SpaceCapabilities.OnCreateSpace, (params) => createIntent(TableAction.OnCreateSpace, params)),
  }),
  Plugin.addModule({
    id: 'on-schema-added',
    activatesOn: SpaceEvents.SchemaAdded,
    activate: () =>
      Capability.contributes(SpaceCapabilities.OnSchemaAdded, ({ db, schema, show }) =>
        createIntent(TableAction.OnSchemaAdded, { db, schema, show }),
      ),
  }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Plugin.addModule({
    id: 'blueprint',
    activatesOn: Common.ActivationEvent.SetupArtifactDefinition,
    activate: BlueprintDefinition,
  }),
  Plugin.make,
);
