//
// Copyright 2023 DXOS.org
//

import {
  Capabilities,
  contributes,
  createIntent,
  defineModule,
  definePlugin,
  Events,
  oneOf,
} from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { RefArray } from '@dxos/react-client/echo';

import { AppGraphSerializer, IntentResolver, ReactSurface, SketchSettings } from './capabilities';
import { meta, SKETCH_PLUGIN } from './meta';
import translations from './translations';
import { CanvasType, DiagramType, SketchAction } from './types';
import { serializer } from './util';

export const SketchPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/settings`,
      activatesOn: Events.SetupSettings,
      activate: SketchSettings,
    }),
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/metadata`,
      activatesOn: oneOf(Events.Startup, Events.SetupAppGraph),
      activate: () =>
        contributes(Capabilities.Metadata, {
          id: DiagramType.typename,
          metadata: {
            createObject: (props: { name?: string }) => createIntent(SketchAction.Create, props),
            placeholder: ['object title placeholder', { ns: SKETCH_PLUGIN }],
            icon: 'ph--compass-tool--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: async (diagram: DiagramType) => await RefArray.loadAll([diagram.canvas]),
            serializer,
          },
        }),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupClient,
      activate: () => [
        contributes(ClientCapabilities.SystemSchema, [CanvasType]),
        contributes(ClientCapabilities.Schema, [DiagramType]),
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
    defineModule({
      id: `${meta.id}/module/app-graph-serializer`,
      activatesOn: Events.Startup,
      activate: AppGraphSerializer,
    }),
  ]);
