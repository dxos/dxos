//
// Copyright 2023 DXOS.org
//

import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';

import { SEARCH_PLUGIN } from './meta';

const SEARCH_ACTION = `${SEARCH_PLUGIN}/action`;

export enum SearchAction {
  SEARCH = `${SEARCH_ACTION}/search`,
}

export type SearchPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides;
