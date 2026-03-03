//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';

import { ChessArticle, ChessCard } from '../../containers';
import { meta } from '../../meta';
import { Chess } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: meta.id,
        role: ['article', 'section'],
        filter: (data): data is { subject: Chess.Game } => Obj.instanceOf(Chess.Game, data.subject),
        component: ({ data, role }) => <ChessArticle role={role} subject={data.subject} />,
      }),
      Surface.create({
        id: meta.id,
        role: ['card--content'],
        filter: (data): data is { subject: Chess.Game } => Obj.instanceOf(Chess.Game, data.subject),
        component: ({ data, role }) => <ChessCard role={role} subject={data.subject} />,
      }),
    ]),
  ),
);
