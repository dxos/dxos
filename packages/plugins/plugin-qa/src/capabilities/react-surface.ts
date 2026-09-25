//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { TestPlanArticle, TestRunArticle } from '#containers';
import { TestPlan, TestRun } from '#types';

export default Capability.makeModule(() =>
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
);
