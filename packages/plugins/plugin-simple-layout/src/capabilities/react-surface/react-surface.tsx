//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { Node } from '@dxos/plugin-graph';

import { Home, Workspace } from '../../components';
import { meta } from '../../meta';

type SurfaceData = {
  attendableId: string;
  properties: Record<string, any>;
};

const ALLOWED_DISPOSITIONS = ['workspace', 'user-account', 'pin-end', 'alternate-tree'];

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}/home`,
        role: 'article',
        filter: (data): data is SurfaceData => data.attendableId === Node.RootId,
        component: () => <Home />,
      }),
      Surface.create({
        id: `${meta.id}/workspace-article`,
        role: 'article',
        position: 'fallback',
        filter: (data): data is SurfaceData =>
          ALLOWED_DISPOSITIONS.includes((data.properties as Record<string, any>)?.disposition),
        component: ({ data }) => <Workspace id={data.attendableId} />,
      }),
    ]),
  ),
);
