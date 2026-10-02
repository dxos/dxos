//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Position } from '@dxos/util';

import { FeedArticle, FeedProperties, MagazineArticle, PostArticle, PostCard } from '#containers';
import { Magazine, Subscription } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.Root.create({
        id: 'magazineArticle',
        filter: AppSurface.object(AppSurface.Article, Magazine.Magazine),
        component: MagazineArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.Root.create({
        id: 'feedArticle',
        filter: AppSurface.object(AppSurface.Article, Subscription.Subscription),
        component: FeedArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.Root.create({
        id: 'postArticle',
        filter: AppSurface.object(AppSurface.Article, Subscription.Post),
        component: PostArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.Root.create({
        id: 'postCard',
        position: Position.first,
        filter: AppSurface.object(AppSurface.CardContent, Subscription.Post),
        component: PostCard,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
      Surface.Root.create({
        id: 'feedProperties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Subscription.Subscription),
        component: FeedProperties,
        props: ({ data: { subject } }) => ({ subject }),
      }),
    ]),
  ),
);
