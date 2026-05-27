//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

const SEARCH_OPERATION = `${DXN.getName(meta.id)}.operation`;

export const OpenSearch = Operation.make({
  meta: { key: DXN.make(`${SEARCH_OPERATION}.openSearch`), name: 'Open Search', icon: 'ph--magnifying-glass--regular' },
  input: Schema.Void,
  output: Schema.Void,
});
