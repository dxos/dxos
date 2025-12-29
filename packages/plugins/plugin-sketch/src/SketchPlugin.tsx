//
// Copyright 2023 DXOS.org
//

import { Capability, Common, Plugin, createIntent } from '@dxos/app-framework';
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
    activatesOn: Common.ActivationEvent.SetupSettings,
    activate: SketchSettings,
  }),
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addMetadataModule({
    metadata: {
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
    },
  }),
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () => Capability.contributes(ClientCapabilities.Schema, [Diagram.Canvas, Diagram.Diagram]),
  }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Plugin.addModule({
    id: 'app-graph-serializer',
    activatesOn: Common.ActivationEvent.AppGraphReady,
    activate: AppGraphSerializer,
  }),
  Plugin.make,
);
