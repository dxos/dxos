//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/operation';

import { meta } from '../meta';

const SEARCH_OPERATION = `${meta.id}/operation`;

export namespace SearchOperation {
  export const OpenSearch = Operation.make({
    meta: { key: `${SEARCH_OPERATION}/open-search`, name: 'Open Search' },
    schema: { input: Schema.Void, output: Schema.Void },
  });
}
