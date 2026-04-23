//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { TicTacToeArticle, TicTacToeCard } from '#containers';
import { TicTacToe } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'game',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, TicTacToe.Game),
          AppSurface.object(AppSurface.Section, TicTacToe.Game),
        ),
        component: ({ data, role }) => (
          <TicTacToeArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'game-card',
        filter: AppSurface.object(AppSurface.Card, TicTacToe.Game),
        component: ({ data, role }) => <TicTacToeCard role={role} subject={data.subject} />,
      }),
    ]),
  ),
);
