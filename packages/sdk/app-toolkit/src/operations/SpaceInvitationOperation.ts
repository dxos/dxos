//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

/**
 * Join a space the local identity has already been admitted to, by its key, then switch to it.
 *
 * Defined here rather than in plugin-space because plugin-client raises the invitation toast and
 * lists pending notices, and plugin-space depends on plugin-client; plugin-space handles it.
 */
export const JoinBySpaceKey = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.appToolkit.joinBySpaceKey'),
    name: 'Join Space By Key',
    description: 'Join a space this identity has been admitted to, by its key.',
    icon: 'ph--sign-in--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    spaceKey: Schema.String.annotate({ description: 'Hex-encoded key of the space to join.' }),
  }),
  output: Schema.Void,
});
