//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { meta } from '../meta';

const MAP_OPERATION = `${meta.id}.operation`;

export const Toggle = Operation.make({
  meta: { key: `${MAP_OPERATION}.toggle`, name: 'Toggle Map' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});
