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
import { S } from '@dxos/echo-schema';

import { SEARCH_PLUGIN } from './meta';

export namespace SearchAction {
  const SEARCH_ACTION = `${SEARCH_PLUGIN}/action`;

  export class OpenSearch extends S.TaggedClass<OpenSearch>()(`${SEARCH_ACTION}/open-search`, {
    input: S.Void,
    output: S.Void,
  }) {}
}

export type SearchPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides;
