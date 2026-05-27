//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { ScoreArticle } from '#containers';
import { Score } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: DXN.make('org.dxos.plugin.sequencer.surface.article'),
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
