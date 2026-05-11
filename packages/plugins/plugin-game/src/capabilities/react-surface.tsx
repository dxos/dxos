//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { GameArticle, GameCard } from '#containers';

import { Game } from '../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'game',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Game),
          AppSurface.object(AppSurface.Section, Game),
        ),
        component: ({ data, role }) => (
          <GameArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'game-card',
        filter: AppSurface.object(AppSurface.Card, Game),
        component: ({ data, role }) => <GameCard role={role} subject={data.subject} />,
      }),
    ]),
  ),
);
