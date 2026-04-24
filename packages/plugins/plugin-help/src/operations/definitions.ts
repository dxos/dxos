//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { meta } from '#meta';

const HELP_OPERATION = `${meta.id}.operation`;

export const Start = Operation.make({
  meta: { key: `${HELP_OPERATION}.start`, name: 'Start Help' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});
