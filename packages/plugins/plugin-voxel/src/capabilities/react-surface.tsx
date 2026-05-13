//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { VoxelArticle, VoxelCard } from '#containers';
import { Voxel } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'world',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Voxel.World),
          AppSurface.object(AppSurface.Section, Voxel.World),
        ),
        component: ({ data, role }) => (
          <VoxelArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'world-card',
        filter: AppSurface.object(AppSurface.Card, Voxel.World),
        component: ({ data, role }) => <VoxelCard role={role} subject={data.subject} />,
      }),
    ]),
  ),
);
