//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit';

import { ExplorerContainer } from '#containers';
import { meta } from '#meta';
import { Graph } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Capabilities.ReactSurface,
      Surface.create({
        id: `${meta.id}.article`,
        role: ['article', 'section'],
        filter: AppSurface.object(Graph.Graph, { attendable: true }),
        component: ({ data, role }) => {
          return <ExplorerContainer role={role} subject={data.subject} attendableId={data.attendableId} />;
        },
      }),
    ),
  ),
);
