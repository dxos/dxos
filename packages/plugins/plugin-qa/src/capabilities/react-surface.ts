//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { TestPlanArticle, TestRunArticle } from '#containers';
import { TestPlan, TestRun } from '#types';

export const ReactSurface = AppCapability.surface(
  () =>
    Effect.succeed(
      Capability.contribute(Capabilities.ReactSurface, [
        Surface.create({
          id: 'testPlanArticle',
          filter: AppSurface.object(AppSurface.Article, TestPlan.TestPlan),
          component: TestPlanArticle,
          props: ({ role, data: { subject } }) => ({ role, subject }),
        }),
        Surface.create({
          id: 'testRunArticle',
          filter: AppSurface.object(AppSurface.Article, TestRun.TestRun),
          component: TestRunArticle,
          props: ({ role, data: { subject } }) => ({ role, subject }),
        }),
      ]),
    ),
  {
    roles: ['org.dxos.role.article', 'org.dxos.role.cardContent'],
  },
);
