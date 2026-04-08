//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit';

import { VoxelArticle, VoxelCard } from '#containers';
import { meta } from '#meta';
import { Voxel } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: meta.id,
        role: ['article', 'section'],
        filter: AppSurface.object(Voxel.World, { attendable: true }),
        component: ({ data, role }) => <VoxelArticle role={role} subject={data.subject} attendableId={data.attendableId} />,
      }),
      Surface.create({
        id: meta.id,
        role: ['card--content'],
        filter: AppSurface.object(Voxel.World),
        component: ({ data, role }) => <VoxelCard role={role} subject={data.subject} />,
      }),
    ]),
  ),
);
