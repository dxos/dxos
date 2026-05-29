//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';

import { meta } from '#meta';

export const Start = Operation.make({
  meta: { key: `${meta.id}.operation.start-welcome-tour`, name: 'Start welcome tour', icon: 'ph--question--regular' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});
