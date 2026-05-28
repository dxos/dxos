//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${DXN.getName(meta.id)}.operation.${name}`);

export const Toggle = Operation.make({
  meta: { key: makeKey('toggle'), name: 'Toggle Map', icon: 'ph--compass--regular' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});
