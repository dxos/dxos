//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { VoxelArticle, VoxelCard } from '#containers';
import { Voxel } from '#types';

export const ReactSurface = AppCapability.surface(
  () =>
    Effect.succeed(
      Capability.contribute(Capabilities.ReactSurface, [
        Surface.create({
          id: 'world',
          // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
          filter: AppSurface.oneOf(
            AppSurface.object(AppSurface.Article, Voxel.World),
            AppSurface.object(AppSurface.Section, Voxel.World),
          ),
          component: VoxelArticle,
          props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
        }),
        Surface.create({
          id: 'worldCard',
          filter: AppSurface.object(AppSurface.CardContent, Voxel.World),
          component: VoxelCard,
          props: ({ role, data: { subject } }) => ({ role, subject }),
        }),
      ]),
    ),
  {
    roles: ['org.dxos.role.article', 'org.dxos.role.cardContent', 'org.dxos.role.section'],
  },
);
