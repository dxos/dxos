//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { AppGraphBuilder, OperationHandler, ReactSurface } from './capabilities';
import { SEARCH_RESULT, meta } from './meta';
import { translations } from './translations';
import { type SearchResult } from './types';

export const SearchPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addMetadataModule({
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
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
