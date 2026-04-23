//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { FeedArticle, MagazineArticle, SubscriptionsArticle } from '#containers';
import { Magazine, Subscription } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      // Main subscription feed list view.
      Surface.create({
        id: 'subscription-feed',
        filter: AppSurface.literal(AppSurface.Article, 'feeds-root'),
        component: ({ data, role }) => (
          <SubscriptionsArticle role={role} attendableId={data.attendableId} subject={data.subject} />
        ),
      }),
      // Companion view: FeedArticle shown alongside the feeds-root.
      Surface.create({
        id: 'feed-article',
        filter: AppSurface.oneOf(
          AppSurface.allOf(
            AppSurface.object(AppSurface.Article, Subscription.Feed),
            AppSurface.companion(AppSurface.Article, 'feeds-root'),
          ),
          AppSurface.allOf(
            AppSurface.object(AppSurface.Section, Subscription.Feed),
            AppSurface.companion(AppSurface.Section, 'feeds-root'),
          ),
        ),
        component: ({ data, role }) => (
          <FeedArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      // Magazine article surface.
      Surface.create({
        id: 'magazine-article',
        filter: AppSurface.object(AppSurface.Article, Magazine.Magazine),
        component: ({ data, role }) => (
          <MagazineArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
    ]),
  ),
);
