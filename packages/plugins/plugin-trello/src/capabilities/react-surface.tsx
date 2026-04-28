//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { TrelloCard } from '#components';
import { TrelloCardArticle } from '#containers';
import { Trello } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'trello-card-article',
        filter: AppSurface.object(AppSurface.Article, Trello.TrelloCard),
        component: ({ data: { subject, attendableId }, role }) => (
          <TrelloCardArticle role={role} subject={subject} attendableId={attendableId} />
        ),
      }),
      Surface.create({
        id: 'trello-card-section',
        filter: AppSurface.object(AppSurface.Section, Trello.TrelloCard),
        component: ({ data: { subject }, role }) => <TrelloCardArticle role={role} subject={subject} />,
      }),
      Surface.create({
        id: 'trello-card',
        filter: AppSurface.object(AppSurface.Card, Trello.TrelloCard),
        component: ({ data: { subject } }) => <TrelloCard card={subject} />,
      }),
    ]),
  ),
);
