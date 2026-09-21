//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { BeaconStatusIndicator } from '#components';

export const ReactSurface = AppCapability.surface(
  () =>
    Effect.succeed(
      Capability.contribute(Capabilities.ReactSurface, [
        Surface.create({
          id: 'beaconStatus',
          filter: Surface.makeFilter(AppSurface.StatusIndicator),
          component: BeaconStatusIndicator,
        }),
      ]),
    ),
  {
    roles: ['org.dxos.role.statusIndicator'],
  },
);
