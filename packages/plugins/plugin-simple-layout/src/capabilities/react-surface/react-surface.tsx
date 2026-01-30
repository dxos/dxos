//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { Node } from '@dxos/plugin-graph';

import { Home, WorkspaceArticle } from '../../components';
import { meta } from '../../meta';

type SurfaceData = {
  attendableId: string;
  properties: Record<string, any>;
};

const ALLOWED_DISPOSITIONS = ['workspace', 'user-account', 'pin-end'];

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      Common.createSurface({
        id: `${meta.id}/home`,
        role: 'article',
        filter: (data): data is SurfaceData => data.attendableId === Node.RootId,
        component: () => <Home />,
      }),
      Common.createSurface({
        id: `${meta.id}/workspace-article`,
        role: 'article',
        position: 'fallback',
        filter: (data): data is SurfaceData =>
          ALLOWED_DISPOSITIONS.includes((data.properties as Record<string, any>)?.disposition),
        component: ({ data }) => <WorkspaceArticle id={data.attendableId} />,
      }),
    ]),
  ),
);
