//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

export const Toggle = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.observability.toggle'),
    name: 'Toggle Observability',
    description: 'Toggle observability on or off.',
    icon: 'ph--eye--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    state: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Boolean,
});

export const SendEvent = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.observability.sendEvent'),
    name: 'Send Event',
    description: 'Send an observability event.',
    icon: 'ph--broadcast--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    name: Schema.String.annotate({ description: 'The name of the event.' }),
    properties: Schema.optional(Schema.Any).annotate({ description: 'Event properties.' }),
  }),
  output: Schema.Void,
});
