//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { TileArticle, TileCard } from '#containers';
import { Tile } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'tile-pattern',
        role: ['article', 'section'],
        filter: AppSurface.objectArticle(Tile.Pattern),
        component: ({ data, role }) => (
          <TileArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'tile-pattern-card',
        role: ['card--content'],
        filter: AppSurface.objectCard(Tile.Pattern),
        component: ({ data, role }) => <TileCard role={role} subject={data.subject} />,
      }),
    ]),
  ),
);
