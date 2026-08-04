//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { ScoreArticle } from '#containers';
import { Score } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'article',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Score.Score),
          AppSurface.object(AppSurface.Section, Score.Score),
        ),
        component: ScoreArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
    ]),
  ),
);
