//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Position } from '@dxos/util';

import { FeedArticle, FeedProperties, MagazineArticle, PostArticle, PostCard } from '#containers';
import { Magazine, Subscription } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.provide(Capabilities.ReactSurface, [
      Surface.create({
        id: 'magazineArticle',
        filter: AppSurface.object(AppSurface.Article, Magazine.Magazine),
        component: ({ data, role }) => (
          <MagazineArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'feedArticle',
        filter: AppSurface.object(AppSurface.Article, Subscription.Subscription),
        component: ({ data, role }) => (
          <FeedArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'postArticle',
        filter: AppSurface.object(AppSurface.Article, Subscription.Post),
        component: ({ data, role }) => (
          <PostArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'postCard',
        position: Position.first,
        filter: AppSurface.object(AppSurface.CardContent, Subscription.Post),
        component: ({ data, role }) => <PostCard role={role} subject={data.subject} />,
      }),
      Surface.create({
        id: 'feedProperties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Subscription.Subscription),
        component: ({ data }) => <FeedProperties subject={data.subject} />,
      }),
    ]),
  ),
);
