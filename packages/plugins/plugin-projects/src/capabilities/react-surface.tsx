//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Project } from '@dxos/compute';

import { ProjectArticle } from '#containers';

/** React surfaces contributed by plugin-projects — the Project detail article. */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'project.article',
        filter: AppSurface.object(AppSurface.Article, Project.Project),
        component: ({ data, role }) => <ProjectArticle role={role} {...data} />,
      }),
    ]),
  ),
);
