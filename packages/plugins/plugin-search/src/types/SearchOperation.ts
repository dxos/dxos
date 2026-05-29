//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';

import { meta } from '#meta';

const SEARCH_OPERATION = `${meta.id}.operation`;

export const OpenSearch = Operation.make({
  meta: { key: `${SEARCH_OPERATION}.open-search`, name: 'Open Search', icon: 'ph--magnifying-glass--regular' },
  input: Schema.Void,
  output: Schema.Void,
});
