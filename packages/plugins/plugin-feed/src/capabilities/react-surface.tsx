//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { FeedArticle, SubscriptionsArticle } from '#containers';
import { meta } from '#meta';
import { Subscription } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      // Main subscription feed list view.
      Surface.create({
        id: `${meta.id}.subscription-feed`,
        role: ['article'],
        filter: AppSurface.literalArticle('feeds-root'),
        component: ({ data, role }) => (
          <SubscriptionsArticle role={role} attendableId={data.attendableId} subject={data.subject} />
        ),
      }),
      // Companion view: FeedArticle shown alongside the feeds-root.
      Surface.create({
        id: `${meta.id}.feed-article`,
        role: ['article', 'section'],
        filter: AppSurface.and(AppSurface.objectArticle(Subscription.Feed), AppSurface.companionArticle('feeds-root')),
        component: ({ data, role }) => (
          <FeedArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
    ]),
  ),
);
