//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';

import { FeedArticle, MagazineArticle, PostArticle, PostCard, SubscriptionsArticle } from '#containers';
import { Magazine, Subscription } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: DXN.make('org.dxos.plugin.feed.surface.subscriptionFeed'),
        filter: AppSurface.literal(AppSurface.Article, 'feeds-root'),
        component: ({ data, role }) => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <SubscriptionsArticle role={role} space={space} attendableId={data.attendableId} />;
        },
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.feed.surface.magazineArticle'),
        filter: AppSurface.object(AppSurface.Article, Magazine.Magazine),
        component: ({ data, role }) => (
          <MagazineArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.feed.surface.feedArticle'),
        filter: AppSurface.object(AppSurface.Article, Subscription.Subscription),
        component: ({ data, role }) => (
          <FeedArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.feed.surface.postArticle'),
        filter: AppSurface.object(AppSurface.Article, Subscription.Post),
        component: ({ data, role }) => (
          <PostArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.feed.surface.postCard'),
        position: 'first',
        filter: AppSurface.object(AppSurface.Card, Subscription.Post),
        component: ({ data, role }) => <PostCard role={role} subject={data.subject} />,
      }),
    ]),
  ),
);
