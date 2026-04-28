//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { lazy } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { Sidekick } from '#types';

const SidekickArticle = lazy(() => import('#containers'));

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Capabilities.ReactSurface,
      Surface.create({
        id: 'sidekick-dashboard',
        filter: AppSurface.object(AppSurface.Article, Sidekick.Profile),
        component: ({ data, role }) => (
          <SidekickArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
    ),
  ),
);
