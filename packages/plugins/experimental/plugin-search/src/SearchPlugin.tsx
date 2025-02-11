//
// Copyright 2023 DXOS.org
//

import { contributes, Events, defineModule, definePlugin, Capabilities, oneOf } from '@dxos/app-framework';

import { AppGraphBuilder, IntentResolver, ReactSurface, ReactContext } from './capabilities';
import { meta, SEARCH_RESULT } from './meta';
import type { SearchResult } from './search-sync';
import translations from './translations';

export const SearchPlugin = () =>
  definePlugin(meta, [
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
      id: `${meta.id}/module/react-context`,
      activatesOn: Events.Startup,
      activate: ReactContext,
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupSurfaces,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntents,
      activate: IntentResolver,
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
  ]);
