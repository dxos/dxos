//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { CommentsArticle } from '#containers';

export const ReactSurface = AppCapability.surface(
  () =>
    Effect.succeed(
      Capability.contribute(Capabilities.ReactSurface, [
        Surface.create({
          id: 'comments',
          filter: AppSurface.allOf(
            AppSurface.literal(AppSurface.Article, 'comments'),
            AppSurface.companion(AppSurface.Article),
          ),
          component: CommentsArticle,
          props: ({ data: { attendableId, companionTo } }) => ({ attendableId, subject: companionTo }),
        }),
      ]),
    ),
  {
    roles: ['org.dxos.role.article'],
  },
);
