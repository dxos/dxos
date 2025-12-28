//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, Plugin, Capability, createIntent } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';
import { RefArray } from '@dxos/react-client/echo';

import { AppGraphSerializer, IntentResolver, ReactSurface, SketchSettings } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Diagram, SketchAction } from './types';
import { serializer } from './util';

export const SketchPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'settings',
    activatesOn: Events.SetupSettings,
    activate: SketchSettings,
  }),
  Plugin.addModule({
    id: 'translations',
    activatesOn: Events.SetupTranslations,
    activate: () => Capability.contributes(Capabilities.Translations, translations),
  }),
  Plugin.addModule({
    id: 'metadata',
    activatesOn: Events.SetupMetadata,
    activate: () =>
      Capability.contributes(Capabilities.Metadata, {
        id: Diagram.Diagram.typename,
        metadata: {
          icon: 'ph--compass-tool--regular',
          iconHue: 'indigo',
          // TODO(wittjosiah): Move out of metadata.
          loadReferences: async (diagram: Diagram.Diagram) => await RefArray.loadAll([diagram.canvas]),
          serializer,
          comments: 'unanchored',
          createObjectIntent: (() => createIntent(SketchAction.Create)) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      }),
  }),
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () => Capability.contributes(ClientCapabilities.Schema, [Diagram.Canvas, Diagram.Diagram]),
  }),
  Plugin.addModule({
    id: 'react-surface',
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    id: 'intent-resolver',
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
  Plugin.addModule({
    id: 'app-graph-serializer',
    activatesOn: Events.AppGraphReady,
    activate: AppGraphSerializer,
  }),
  Plugin.make,
);
