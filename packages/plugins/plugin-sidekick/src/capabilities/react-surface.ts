//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { lazy } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { Sidekick } from '#types';

const SidekickArticle = lazy(() => import('#containers'));

export const ReactSurface = AppCapability.surface(
  () =>
    Effect.succeed(
      Capability.contribute(
        Capabilities.ReactSurface,
        Surface.create({
          id: 'sidekickDashboard',
          filter: AppSurface.object(AppSurface.Article, Sidekick.Profile),
          component: SidekickArticle,
          props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
        }),
      ),
    ),
  {
    roles: ['org.dxos.role.article'],
  },
);
