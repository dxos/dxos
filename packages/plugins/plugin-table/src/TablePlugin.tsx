//
// Copyright 2025 DXOS.org
//

import { createIntent, definePlugin, defineModule, Events, contributes, Capabilities } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { type Space } from '@dxos/react-client/echo';
import { translations as formTranslations } from '@dxos/react-ui-form';
import { TableType, translations as tableTranslations } from '@dxos/react-ui-table';
import { ViewType } from '@dxos/schema';

import { AppGraphBuilder, Artifact, IntentResolver, ReactSurface } from './capabilities';
import { meta, TABLE_PLUGIN } from './meta';
import { serializer } from './serializer';
import translations from './translations';
import { CreateTableSchema, type CreateTableType, TableAction } from './types';

export const TablePlugin = () =>
  definePlugin(meta, [
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
          id: TableType.typename,
          metadata: {
            // TODO(ZaymonFC): This should be shared with the create schema!
            creationSchema: CreateTableSchema,
            createObject: (props: CreateTableType, options: { space: Space }) =>
              createIntent(TableAction.Create, { ...props, space: options.space }),
            label: (object: any) => (object instanceof TableType ? object.name : undefined),
            placeholder: ['object placeholder', { ns: TABLE_PLUGIN }],
            icon: 'ph--table--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (table: TableType) => [], // loadObjectReferences(table, (table) => [table.schema]),
            serializer,
          },
        }),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () => [
        contributes(ClientCapabilities.SystemSchema, [ViewType]),
        contributes(ClientCapabilities.Schema, [TableType]),
      ],
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupSurfaces,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntents,
      activate: IntentResolver,
    }),
    defineModule({
      id: `${meta.id}/module/complementary-panel`,
      activatesOn: Events.Startup,
      activate: () =>
        contributes(DeckCapabilities.ComplementaryPanel, {
          id: 'selected-objects',
          label: ['objects label', { ns: TABLE_PLUGIN }],
          icon: 'ph--tree-view--regular',
        }),
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
    defineModule({
      id: `${meta.id}/module/artifact`,
      activatesOn: Events.Startup,
      activate: Artifact,
    }),
  ]);
