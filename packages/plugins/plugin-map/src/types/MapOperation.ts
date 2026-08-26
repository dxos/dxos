//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

export const SetControlType = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.map.setControlType'),
    name: 'Set Map Control Type',
    icon: 'ph--compass--regular',
  },
  services: [Capability.Service],
  // Required: the caller states the view it wants rather than flipping whatever is current.
  input: Schema.Struct({ type: Schema.Literals(['globe', 'map']) }),
  output: Schema.Void,
});
