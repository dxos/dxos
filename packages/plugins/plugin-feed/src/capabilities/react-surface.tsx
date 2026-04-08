//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { useActiveSpace } from '@dxos/app-toolkit/ui';

import { FeedArticle, SubscriptionsArticle } from '#containers';
import { meta } from '#meta';
import { Subscription } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      // Main subscription feed list view.
      Surface.create({
        id: 'subscription-feed',
        role: ['article'],
        filter: (
          data,
        ): data is {
          attendableId?: string;
          subject: 'feeds-root';
        } => data.subject === 'feeds-root' && !data.companionTo,
        component: ({ data, role }) => {
          const space = useActiveSpace();
          return <SubscriptionsArticle role={role} space={space} attendableId={data.attendableId} />;
        },
      }),
      // Companion view: FeedArticle shown alongside a parent Subscription.Feed.
      Surface.create({
        id: 'feed-article',
        role: ['article', 'section'],
        filter: (
          data,
        ): data is {
          attendableId?: string;
          subject: Subscription.Feed;
          companionTo: Subscription.Feed;
        } => Subscription.instanceOf(data.subject) && data.companionTo === 'feeds-root',
        component: ({ data, role }) => (
          <FeedArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
    ]),
  ),
);
