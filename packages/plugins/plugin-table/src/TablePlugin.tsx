//
// Copyright 2025 DXOS.org
//

import { Capabilities, Events, contributes, createIntent, defineModule, definePlugin } from '@dxos/app-framework';
import { ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';
import { translations as formTranslations } from '@dxos/react-ui-form';
import { translations as tableTranslations } from '@dxos/react-ui-table';
import { Table } from '@dxos/react-ui-table/types';

import { BlueprintDefinition, IntentResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { CreateTableSchema, TableAction } from './types';

export const TablePlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/translations`,
    activatesOn: Events.SetupTranslations,
    activate: () =>
      contributes(Capabilities.Translations, [...translations, ...formTranslations, ...tableTranslations]),
  }),
  defineModule({
    id: `${meta.id}/module/metadata`,
    activatesOn: Events.SetupMetadata,
    activate: () =>
      contributes(Capabilities.Metadata, {
        id: Table.Table.typename,
        metadata: {
          icon: 'ph--table--regular',
          iconHue: 'green',
          comments: 'unanchored',
        },
      }),
  }),
  defineModule({
    id: `${meta.id}/module/object-form`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () =>
      contributes(
        SpaceCapabilities.ObjectForm,
        defineObjectForm({
          objectSchema: Table.Table,
          formSchema: CreateTableSchema,
          hidden: true,
          getIntent: (props, options) => createIntent(TableAction.Create, { ...props, space: options.space }),
        }),
      ),
  }),
  defineModule({
    id: `${meta.id}/module/on-space-created`,
    activatesOn: SpaceEvents.SpaceCreated,
    activate: () =>
      contributes(SpaceCapabilities.onCreateSpace, ({ space }) => createIntent(TableAction.onCreateSpace, { space })),
  }),
  defineModule({
    id: `${meta.id}/module/on-schema-added`,
    activatesOn: SpaceEvents.SchemaAdded,
    activate: () =>
      contributes(SpaceCapabilities.OnSchemaAdded, ({ space, schema, show }) =>
        createIntent(TableAction.OnSchemaAdded, { space, schema, show }),
      ),
  }),
  defineModule({
    id: `${meta.id}/module/react-surface`,
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  defineModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
  defineModule({
    id: `${meta.id}/module/blueprint`,
    activatesOn: Events.SetupArtifactDefinition,
    activate: BlueprintDefinition,
  }),
]);
