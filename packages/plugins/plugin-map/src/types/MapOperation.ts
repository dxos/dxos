//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

export const Toggle = Operation.make({
  meta: { key: makeKey('toggle'), name: 'Toggle Map', icon: 'ph--compass--regular' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});
