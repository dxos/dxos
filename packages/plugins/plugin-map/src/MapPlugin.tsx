//
// Copyright 2023 DXOS.org
//

import { Capabilities, contributes, createIntent, defineModule, definePlugin, Events } from '@dxos/app-framework';
import { ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';

import { AppGraphBuilder, ArtifactDefinition, IntentResolver, ReactSurface, MapState } from './capabilities';
import { MAP_PLUGIN, meta } from './meta';
import translations from './translations';
import { MapType, MapAction, CreateMapSchema } from './types';

export const MapPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/state`,
      // TODO(wittjosiah): Does not integrate with settings store.
      //   Should this be a different event?
      //   Should settings store be renamed to be more generic?
      activatesOn: Events.SetupSettings,
      activate: MapState,
    }),
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/metadata`,
      activatesOn: Events.SetupMetadata,
      activate: () =>
        contributes(Capabilities.Metadata, {
          id: MapType.typename,
          metadata: {
            placeholder: ['object placeholder', { ns: MAP_PLUGIN }],
            icon: 'ph--compass--regular',
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
            objectSchema: MapType,
            formSchema: CreateMapSchema,
            getIntent: (props, options) => createIntent(MapAction.Create, { ...props, space: options.space }),
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
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
    defineModule({
      id: `${meta.id}/module/artifact-definition`,
      activatesOn: Events.SetupArtifactDefinition,
      activate: ArtifactDefinition,
    }),
  ]);
