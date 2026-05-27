//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { ExplorerArticle } from '#containers';
import { Graph } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Capabilities.ReactSurface,
      Surface.create({
        id: 'article',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Graph.Graph),
          AppSurface.object(AppSurface.Section, Graph.Graph),
        ),
        component: ({ data, role }) => {
          return <ExplorerArticle role={role} subject={data.subject} attendableId={data.attendableId} />;
        },
      }),
    ),
  ),
);
