//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, Plugin, Capability, createIntent } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { Diagram } from '@dxos/plugin-sketch/types';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';

import { ExcalidrawSettings, IntentResolvers, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { SketchAction } from './types';

export const ExcalidrawPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'settings',
    activatesOn: Events.SetupSettings,
    activate: ExcalidrawSettings,
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
    activate: IntentResolvers,
  }),
  Plugin.make,
);
