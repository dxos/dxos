//
// Copyright 2023 DXOS.org
//

import { Common, Plugin, createIntent } from '@dxos/app-framework';
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
  Common.Plugin.addSchemaModule({
    schema: [Journal.JournalEntry, Journal.Journal, Outline.Outline],
  }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Plugin.make,
);
