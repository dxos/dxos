//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { type View } from '@dxos/schema';

import { ExplorerContainer } from '../../components';
import { meta } from '../../meta';
import { Graph } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Common.Capability.ReactSurface,
      Common.createSurface({
        id: `${meta.id}/article`,
        role: ['article', 'section'],
        filter: (data): data is { subject: View.View } => Obj.instanceOf(Graph.Graph, data.subject),
        component: ({ data, role }) => {
          return <ExplorerContainer view={data.subject} role={role} />;
        },
      }),
    ),
  ),
);
