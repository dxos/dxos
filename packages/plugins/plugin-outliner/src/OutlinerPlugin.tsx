//
// Copyright 2023 DXOS.org
//

import { Capability, Common, Plugin, createIntent } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';

import { AppGraphBuilder, IntentResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Journal, Outline, OutlineAction } from './types';

export const OutlinerPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addMetadataModule({
    metadata: [
      {
        id: Journal.Journal.typename,
        metadata: {
          icon: 'ph--calendar-check--regular',
          iconHue: 'indigo',
          createObjectIntent: (() => createIntent(OutlineAction.CreateJournal)) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      },
      {
        id: Outline.Outline.typename,
        metadata: {
          icon: 'ph--tree-structure--regular',
          iconHue: 'indigo',
          createObjectIntent: (() => createIntent(OutlineAction.CreateOutline)) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      },
    ],
  }),
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () =>
      Capability.contributes(ClientCapabilities.Schema, [Journal.JournalEntry, Journal.Journal, Outline.Outline]),
  }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Plugin.make,
);
