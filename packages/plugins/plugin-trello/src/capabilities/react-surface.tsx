//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { TrelloArticle, TrelloCardArticle } from '#containers';
import { Trello } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'trello-board',
        role: ['article', 'section'],
        filter: AppSurface.objectArticle(Trello.TrelloBoard),
        component: ({ data, role }) => (
          <TrelloArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'trello-card',
        role: ['article', 'section'],
        filter: AppSurface.objectArticle(Trello.TrelloCard),
        component: ({ data, role }) => (
          <TrelloCardArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
    ]),
  ),
);
