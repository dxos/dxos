//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { type View } from '@dxos/schema';

import { ExplorerContainer } from '../../containers';
import { meta } from '../../meta';
import { Graph } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Capabilities.ReactSurface,
      Surface.create({
        id: `${meta.id}/article`,
        role: ['article', 'section'],
        filter: (data): data is { subject: View.View } => Obj.instanceOf(Graph.Graph, data.subject),
        component: ({ data, role }) => {
          return <ExplorerContainer role={role} subject={data.subject} />;
        },
      }),
    ),
  ),
);
