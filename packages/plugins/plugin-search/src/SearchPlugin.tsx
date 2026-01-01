//
// Copyright 2023 DXOS.org
//

import { Common, Plugin } from '@dxos/app-framework';

import { AppGraphBuilder, IntentResolver, OperationHandler, ReactSurface } from './capabilities';
import { SEARCH_RESULT, meta } from './meta';
import { translations } from './translations';
import { type SearchResult } from './types';

export const SearchPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addMetadataModule({
    metadata: {
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
    },
  }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Common.Plugin.addOperationHandlerModule({ activate: OperationHandler }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Plugin.make,
);
