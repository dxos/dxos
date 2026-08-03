//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { ZenArticle } from '#containers';

import * as Dream from '../types/Dream';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'root',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Dream.Dream),
          AppSurface.object(AppSurface.Section, Dream.Dream),
        ),
        component: ({ data, role }) => (
          <ZenArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
    ]),
  ),
);
