//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

export const Start = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.support.startWelcomeTour'),
    name: 'Start welcome tour',
    icon: 'ph--question--regular',
  },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

/**
 * Runs a tour registered via `AppCapabilities.Tour`, by id. Invoked from the help companion's tour
 * list and from the first-open auto-start; the id is recorded as seen so an `auto` tour fires once.
 */
export const StartTour = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.support.startTour'),
    name: 'Start tour',
    icon: 'ph--path--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({ tourId: Schema.String }),
  output: Schema.Void,
});

/**
 * Persists the "welcome dismissed" annotation on the settings space so the Welcome carousel stays
 * hidden on the default space's Home page. Invoked from the Home article toolbar's "Hide Welcome"
 * action.
 */
export const HideWelcome = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.support.hideWelcome'),
    name: 'Hide Welcome',
    icon: 'ph--eye-slash--regular',
  },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});
