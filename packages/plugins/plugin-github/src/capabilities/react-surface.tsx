//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Task } from '@dxos/types';

import { PullRequestChangesCompanion } from '#containers';
import { meta } from '#meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.profile.key}/pull-request-changes`,
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'changes'),
          AppSurface.companion(AppSurface.Article, Task.Task),
        ),
        component: ({ data, role }) => <PullRequestChangesCompanion role={role} subject={data.companionTo} />,
      }),
    ]),
  ),
);
