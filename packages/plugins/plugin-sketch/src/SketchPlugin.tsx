//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, createIntent, defineModule, definePlugin } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';
import { RefArray } from '@dxos/react-client/echo';

import { AppGraphSerializer, IntentResolver, ReactSurface, SketchSettings } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { CanvasType, DiagramType, SketchAction } from './types';
import { serializer } from './util';

export const SketchPlugin = definePlugin(meta, () => [
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
    activatesOn: Events.SetupMetadata,
    activate: () =>
      contributes(Capabilities.Metadata, {
        id: DiagramType.typename,
        metadata: {
          icon: 'ph--compass-tool--regular',
          iconClassName: 'text-skySurfaceText',
          // TODO(wittjosiah): Move out of metadata.
          loadReferences: async (diagram: DiagramType) => await RefArray.loadAll([diagram.canvas]),
          serializer,
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
          objectSchema: DiagramType,
          getIntent: () => createIntent(SketchAction.Create),
        }),
      ),
  }),
  defineModule({
    id: `${meta.id}/module/schema`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () => contributes(ClientCapabilities.Schema, [CanvasType]),
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
    id: `${meta.id}/module/app-graph-serializer`,
    activatesOn: Events.AppGraphReady,
    activate: AppGraphSerializer,
  }),
]);
