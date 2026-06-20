//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { SpaceSchema } from '@dxos/client-protocol';
import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

export const Start = Operation.make({
  meta: {
    key: makeKey('startWelcomeTour'),
    name: 'Start welcome tour',
    icon: 'ph--question--regular',
  },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

/**
 * Persists the per-space "welcome dismissed" annotation so the Welcome carousel stays hidden on
 * the personal space's Home page. Invoked from the Home article toolbar's "Hide Welcome" action.
 */
export const HideWelcome = Operation.make({
  meta: {
    key: makeKey('hideWelcome'),
    name: 'Hide Welcome',
    icon: 'ph--eye-slash--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    space: SpaceSchema,
  }),
  output: Schema.Void,
});
