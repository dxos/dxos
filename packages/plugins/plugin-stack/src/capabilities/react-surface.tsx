//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Collection } from '@dxos/echo';

import { StackArticle } from '#containers';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Capabilities.ReactSurface,
      Surface.create({
        id: DXN.make('org.dxos.plugin.stack.surface.article'),
        filter: AppSurface.object(AppSurface.Article, Collection.Collection),
        component: ({ role, data }) => {
          return <StackArticle attendableId={data.attendableId} role={role} subject={data.subject} />;
        },
      }),
    ),
  ),
);
