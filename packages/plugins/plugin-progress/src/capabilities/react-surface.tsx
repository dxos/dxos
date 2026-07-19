//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { ProgressStatusIndicator } from '#components';

export default Capability.inlineModule('ReactSurface', { provides: [Capabilities.ReactSurface] }, () =>
  Effect.succeed([
    Capability.provide(Capabilities.ReactSurface, [
      Surface.create({
        id: 'progressStatusIndicator',
        filter: Surface.makeFilter(AppSurface.StatusIndicator),
        component: () => <ProgressStatusIndicator />,
      }),
    ]),
  ]),
);
