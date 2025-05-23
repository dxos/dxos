//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { SEARCH_PLUGIN } from '../meta';

export namespace SearchAction {
  const SEARCH_ACTION = `${SEARCH_PLUGIN}/action`;

  export class OpenSearch extends Schema.TaggedClass<OpenSearch>()(`${SEARCH_ACTION}/open-search`, {
    input: Schema.Void,
    output: Schema.Void,
  }) {}
}
