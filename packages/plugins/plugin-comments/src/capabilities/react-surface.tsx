//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { CommentsArticle } from '#containers';

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.provide(Capabilities.ReactSurface, [
      Surface.create({
        id: 'comments',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'comments'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: ({ data }) => <CommentsArticle attendableId={data.attendableId} subject={data.companionTo} />,
      }),
    ]),
  ]),
);
