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

/** Runs a tour registered via `AppCapabilities.Tour`, by id, and records it as seen. */
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
