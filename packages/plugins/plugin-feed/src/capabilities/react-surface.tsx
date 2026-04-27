//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { FeedArticle, MagazineArticle, PostArticle, SubscriptionsArticle } from '#containers';
import { Magazine, Subscription } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'subscription-feed',
        filter: AppSurface.literal(AppSurface.Article, 'feeds-root'),
        component: ({ data, role }) => (
          <SubscriptionsArticle role={role} attendableId={data.attendableId} subject={data.subject} />
        ),
      }),
      Surface.create({
        id: 'magazine-article',
        filter: AppSurface.object(AppSurface.Article, Magazine.Magazine),
        component: ({ data, role }) => (
          <MagazineArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'feed-article',
        filter: AppSurface.object(AppSurface.Article, Subscription.Feed),
        component: ({ data, role }) => (
          <FeedArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'post-article',
        filter: AppSurface.object(AppSurface.Article, Subscription.Post),
        component: ({ data, role }) => (
          <PostArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
    ]),
  ),
);
