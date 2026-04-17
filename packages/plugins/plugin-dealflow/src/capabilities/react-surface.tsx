//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { DealArticle, PortfolioDashboard } from '#containers';
import { Dashboard, Deal } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'deal-article',
        role: ['article', 'section'],
        filter: AppSurface.objectArticle(Deal.Deal),
        component: ({ data, role }) => (
          <DealArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'portfolio-dashboard',
        role: ['article', 'section'],
        filter: AppSurface.objectArticle(Dashboard.Dashboard),
        component: ({ data, role }) => (
          <PortfolioDashboard role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
    ]),
  ),
);
