//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Collection } from '@dxos/echo';

import { StackArticle } from '#containers';

export const ReactSurface = AppCapability.surface(
  () =>
    Effect.succeed(
      Capability.contribute(
        Capabilities.ReactSurface,
        Surface.create({
          id: 'article',
          filter: AppSurface.object(AppSurface.Article, Collection.Collection),
          component: StackArticle,
          props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
        }),
      ),
    ),
  {
    roles: ['org.dxos.role.article'],
  },
);
