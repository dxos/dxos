//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { ScoreArticle } from '#containers';

import * as Score from '../types/Score';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'article',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Score.Score),
          AppSurface.object(AppSurface.Section, Score.Score),
        ),
        component: ({ data, role }) => (
          <ScoreArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
    ]),
  ),
);
