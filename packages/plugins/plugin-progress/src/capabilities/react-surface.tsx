//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { ProgressStatusIndicator } from '#components';

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'progressStatusIndicator',
        filter: Surface.makeFilter(AppSurface.StatusIndicator),
        component: () => <ProgressStatusIndicator />,
      }),
    ]),
  ]),
);
