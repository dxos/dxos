//
// Copyright 2023 DXOS.org
//

import { createIntent, definePlugin, defineModule, Events, contributes, Capabilities } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { type Space } from '@dxos/react-client/echo';
import { translations as formTranslations } from '@dxos/react-ui-form';
import { TableType, translations as tableTranslations } from '@dxos/react-ui-table';
import { ViewType } from '@dxos/schema';

import { IntentResolver, ReactSurface } from './capabilities';
import { meta, TABLE_PLUGIN } from './meta';
import { serializer } from './serializer';
import translations from './translations';
import { TableAction } from './types';

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
      activatesOn: Events.Startup,
      activate: () =>
        contributes(Capabilities.Metadata, {
          id: TableType.typename,
          metadata: {
            createObject: (props: { name?: string; space: Space }) => createIntent(TableAction.Create, props),
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
      activatesOn: ClientEvents.SetupClient,
      activate: () => [
        contributes(ClientCapabilities.SystemSchema, [ViewType]),
        contributes(ClientCapabilities.Schema, [TableType]),
      ],
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.Startup,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntents,
      activate: IntentResolver,
    }),
  ]);
