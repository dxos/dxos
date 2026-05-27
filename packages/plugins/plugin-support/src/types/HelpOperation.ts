//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

export const Start = Operation.make({
  meta: {
    key: DXN.make(`${DXN.getName(meta.id)}.operation.startWelcomeTour`),
    name: 'Start welcome tour',
    icon: 'ph--question--regular',
  },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});
