//
// Copyright 2025 DXOS.org
//

import { createIntent, definePlugin, defineModule, Events, contributes, Capabilities } from '@dxos/app-framework';
import { ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';
import { translations as formTranslations } from '@dxos/react-ui-form';
import { translations as tableTranslations } from '@dxos/react-ui-table';

import { AppGraphBuilder, ArtifactDefinition, IntentResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import translations from './translations';
import { CreateTableSchema, TableAction, TableView } from './types';

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
          id: TableView.typename,
          metadata: {
            icon: 'ph--table--regular',
            comments: 'unanchored',
          },
        }),
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
    defineModule({
      id: `${meta.id}/module/object-form`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () =>
        contributes(
          SpaceCapabilities.ObjectForm,
          defineObjectForm({
            objectSchema: TableView,
            formSchema: CreateTableSchema,
            getIntent: (props, options) => createIntent(TableAction.Create, { ...props, space: options.space }),
          }),
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
      id: `${meta.id}/module/artifact-definition`,
      activatesOn: Events.SetupArtifactDefinition,
      activate: ArtifactDefinition,
    }),
  ]);
