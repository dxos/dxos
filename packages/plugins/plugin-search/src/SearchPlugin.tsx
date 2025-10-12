//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, defineModule, definePlugin } from '@dxos/app-framework';

import { AppGraphBuilder, IntentResolver, ReactSurface } from './capabilities';
import { SEARCH_RESULT, meta } from './meta';
import { translations } from './translations';
import { type SearchResult } from './types';

export const SearchPlugin = definePlugin(meta, () => [
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
  defineModule({
    id: `${meta.id}/module/app-graph-builder`,
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  defineModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
  defineModule({
    id: `${meta.id}/module/react-surface`,
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
]);
