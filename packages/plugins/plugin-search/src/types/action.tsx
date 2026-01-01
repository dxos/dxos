//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/operation';

import { meta } from '../meta';

export namespace SearchAction {
  const SEARCH_ACTION = `${meta.id}/action`;

  export class OpenSearch extends Schema.TaggedClass<OpenSearch>()(`${SEARCH_ACTION}/open-search`, {
    input: Schema.Void,
    output: Schema.Void,
  }) {}
}

const SEARCH_OPERATION = `${meta.id}/operation`;

export namespace SearchOperation {
  export const OpenSearch = Operation.make({
    meta: { key: `${SEARCH_OPERATION}/open-search`, name: 'Open Search' },
    schema: { input: Schema.Void, output: Schema.Void },
  });
}
