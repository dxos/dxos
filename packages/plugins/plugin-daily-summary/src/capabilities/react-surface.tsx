//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit';
import { useActiveSpace } from '@dxos/app-toolkit/ui';

import { DailySummarySettings } from '#containers';
import { meta } from '#meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}.space-settings-daily-summary`,
        role: 'article',
        filter: AppSurface.literal(`${meta.id}.space-settings-daily-summary`),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <DailySummarySettings space={space} />;
        },
      }),
    ]),
  ),
);
