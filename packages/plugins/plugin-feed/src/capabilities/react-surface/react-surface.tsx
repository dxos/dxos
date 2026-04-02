//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';

import { FeedArticle, SubscriptionArticle } from '../../containers';
import { meta } from '../../meta';
import { Subscription } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      // Main subscription feed list view.
      Surface.create({
        id: `${meta.id}.subscription-feed`,
        role: ['article'],
        filter: (data): data is { subject: Subscription.Feed; attendableId?: string } =>
          Subscription.instanceOf(data.subject) && !data.companionTo,
        component: ({ data, role }) => (
          <SubscriptionArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      // Companion view: FeedArticle shown when a post is selected within a subscription feed.
      Surface.create({
        id: `${meta.id}.feed-article`,
        role: ['article', 'section'],
        filter: (
          data,
        ): data is {
          attendableId?: string;
          subject: Subscription.Post;
          companionTo: Subscription.Feed;
        } => Obj.instanceOf(Subscription.Post, data.subject) && Subscription.instanceOf(data.companionTo),
        component: ({ data, role }) => (
          <FeedArticle role={role} subject={data.companionTo} attendableId={data.attendableId} />
        ),
      }),
    ]),
  ),
);
