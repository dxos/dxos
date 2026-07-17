//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Collection } from '@dxos/echo';

import { StackArticle } from '#containers';

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.provide(
      Capabilities.ReactSurface,
      Surface.create({
        id: 'article',
        filter: AppSurface.object(AppSurface.Article, Collection.Collection),
        component: ({ role, data }) => {
          return <StackArticle attendableId={data.attendableId} role={role} subject={data.subject} />;
        },
      }),
    ),
  ]),
);
