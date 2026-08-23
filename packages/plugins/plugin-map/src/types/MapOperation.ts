//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

export const Toggle = Operation.make({
  meta: { key: DXN.make('org.dxos.operation.map.toggle'), name: 'Toggle Map', icon: 'ph--compass--regular' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});
