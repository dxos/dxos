//
// Copyright 2023 DXOS.org
//

import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';

export const SEARCH_PLUGIN = 'dxos.org/plugin/search';

const SEARCH_ACTION = `${SEARCH_PLUGIN}/action`;

export enum SearchAction {
  SEARCH = `${SEARCH_ACTION}/search`,
}

export type SearchPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides;
