//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { NOT_FOUND_PATH } from '@dxos/app-toolkit';
import { NotFoundArticle } from '@dxos/app-toolkit/ui';
import { Node } from '@dxos/plugin-graph';

import { Home, NavBranch } from '#components';
import { meta } from '#meta';

type SurfaceData = {
  attendableId: string;
  properties: Record<string, any>;
};

const ALLOWED_DISPOSITIONS = ['workspace', 'user-account', 'pin-end', 'alternate-tree'];

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}.home`,
        role: 'article',
        filter: (data): data is SurfaceData => data.attendableId === Node.RootId,
        component: () => <Home />,
      }),
      Surface.create({
        id: `${meta.id}.not-found`,
        role: 'article',
        filter: (data): data is SurfaceData => data.attendableId === NOT_FOUND_PATH,
        component: () => <NotFoundArticle />,
      }),
      Surface.create({
        id: `${meta.id}.nav-branch`,
        role: 'article',
        position: 'fallback',
        filter: (data): data is SurfaceData => {
          const props = data.properties as Record<string, any>;
          return ALLOWED_DISPOSITIONS.includes(props?.disposition) || props?.role === 'branch';
        },
        component: ({ data }) => <NavBranch id={data.attendableId} />,
      }),
    ]),
  ),
);
