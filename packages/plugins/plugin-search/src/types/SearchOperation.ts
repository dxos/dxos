//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

export const OpenSearch = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.search.open'),
    name: 'Open Search',
    icon: 'ph--magnifying-glass--regular',
  },
  input: Schema.Void,
  output: Schema.Void,
});
