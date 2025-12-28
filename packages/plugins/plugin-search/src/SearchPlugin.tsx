//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, Plugin, Capability } from '@dxos/app-framework';

import { AppGraphBuilder, IntentResolver, ReactSurface } from './capabilities';
import { SEARCH_RESULT, meta } from './meta';
import { translations } from './translations';
import { type SearchResult } from './types';

export const SearchPlugin = Plugin.define(meta).pipe(
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
        id: SEARCH_RESULT,
        metadata: {
          parse: (item: SearchResult, type: string) => {
            switch (type) {
              case 'node':
                return { id: item.id, label: item.label, data: item.object };
              case 'object':
                return item.object;
              case 'view-object':
                return item;
            }
          },
        },
      }),
  }),
  Plugin.addModule({
    id: 'app-graph-builder',
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  Plugin.addModule({
    id: 'intent-resolver',
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
  Plugin.addModule({
    id: 'react-surface',
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.make,
);
