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
 * Persists the "welcome dismissed" annotation on the settings space so the Welcome carousel stays
 * hidden on the default space's Home page. Invoked from the Home article toolbar's "Hide Welcome"
 * action.
 */
export const HideWelcome = Operation.make({
  meta: {
    key: makeKey('hideWelcome'),
    name: 'Hide Welcome',
    icon: 'ph--eye-slash--regular',
  },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});
