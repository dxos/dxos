//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';

import { VoxelArticle, VoxelCard } from '../containers';
import { meta } from '../meta';
import { Voxel } from '../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: meta.id,
        role: ['article', 'section'],
        filter: (data): data is { subject: Voxel.World } => Obj.instanceOf(Voxel.World, data.subject),
        component: ({ data, role }) => <VoxelArticle role={role} subject={data.subject} />,
      }),
      Surface.create({
        id: meta.id,
        role: ['card--content'],
        filter: (data): data is { subject: Voxel.World } => Obj.instanceOf(Voxel.World, data.subject),
        component: ({ data, role }) => <VoxelCard role={role} subject={data.subject} />,
      }),
    ]),
  ),
);
