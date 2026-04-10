//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';

import { BeaconStatusIndicator } from '#components';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'beacon-status',
        role: 'status-indicator',
        component: () => <BeaconStatusIndicator />,
      }),
    ]),
  ),
);
