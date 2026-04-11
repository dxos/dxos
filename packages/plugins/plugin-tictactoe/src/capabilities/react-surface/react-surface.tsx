//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';

import { TicTacToeArticle, TicTacToeCard } from '../../containers';
import { meta } from '../../meta';
import { TicTacToe } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: meta.id,
        role: ['article', 'section'],
        filter: (data): data is { subject: TicTacToe.Game } => Obj.instanceOf(TicTacToe.Game, data.subject),
        component: ({ data, role }) => <TicTacToeArticle role={role} subject={data.subject} />,
      }),
      Surface.create({
        id: meta.id,
        role: ['card--content'],
        filter: (data): data is { subject: TicTacToe.Game } => Obj.instanceOf(TicTacToe.Game, data.subject),
        component: ({ data, role }) => <TicTacToeCard role={role} subject={data.subject} />,
      }),
    ]),
  ),
);
