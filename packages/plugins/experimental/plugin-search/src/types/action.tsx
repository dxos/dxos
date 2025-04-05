//
// Copyright 2023 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { SEARCH_PLUGIN } from '../meta';

export namespace SearchAction {
  const SEARCH_ACTION = `${SEARCH_PLUGIN}/action`;

  export class OpenSearch extends S.TaggedClass<OpenSearch>()(`${SEARCH_ACTION}/open-search`, {
    input: S.Void,
    output: S.Void,
  }) {}
}
