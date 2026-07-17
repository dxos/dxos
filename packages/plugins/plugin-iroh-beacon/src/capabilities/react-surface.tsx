//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { BeaconStatusIndicator } from '#components';

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.provide(Capabilities.ReactSurface, [
      Surface.create({
        id: 'beaconStatus',
        filter: Surface.makeFilter(AppSurface.StatusIndicator),
        component: () => <BeaconStatusIndicator />,
      }),
    ]),
  ]),
);
