//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

export const OpenSearch = Operation.make({
  meta: { key: makeKey('openSearch'), name: 'Open Search', icon: 'ph--magnifying-glass--regular' },
  input: Schema.Void,
  output: Schema.Void,
});
