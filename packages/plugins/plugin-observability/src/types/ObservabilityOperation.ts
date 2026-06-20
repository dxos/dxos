//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

export const Toggle = Operation.make({
  meta: {
    key: makeKey('toggle'),
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
    key: makeKey('sendEvent'),
    name: 'Send Event',
    description: 'Send an observability event.',
    icon: 'ph--broadcast--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    name: Schema.String.annotations({ description: 'The name of the event.' }),
    properties: Schema.optional(Schema.Any).annotations({ description: 'Event properties.' }),
  }),
  output: Schema.Void,
});
