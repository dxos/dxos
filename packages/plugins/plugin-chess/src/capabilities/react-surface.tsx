//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { ChessArticle, ChessCard } from '#containers';
import { meta } from '#meta';
import { Chess } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: meta.id,
        role: ['article', 'section'],
        filter: AppSurface.objectArticle(Chess.Game),
        component: ({ data, role }) => (
          <ChessArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: meta.id,
        role: ['card--content'],
        filter: AppSurface.objectCard(Chess.Game),
        component: ({ data, role }) => <ChessCard role={role} subject={data.subject} />,
      }),
    ]),
  ),
);
