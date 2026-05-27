//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

const MAP_OPERATION = `${DXN.getName(meta.id)}.operation`;

export const Toggle = Operation.make({
  meta: { key: DXN.make(`${MAP_OPERATION}.toggle`), name: 'Toggle Map', icon: 'ph--compass--regular' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});
