//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type ComponentProps } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Position } from '@dxos/util';

import { FeedArticle, FeedDialog, FeedProperties, MagazineArticle, PostArticle, PostCard } from '#containers';
import { Magazine, Subscription } from '#types';

import { FEED_DIALOG } from '../constants';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'magazineArticle',
        filter: AppSurface.object(AppSurface.Article, Magazine.Magazine),
        component: MagazineArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'feedArticle',
        filter: AppSurface.object(AppSurface.Article, Subscription.Subscription),
        component: FeedArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'postArticle',
        filter: AppSurface.object(AppSurface.Article, Subscription.Post),
        component: PostArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'postCard',
        position: Position.first,
        filter: AppSurface.object(AppSurface.CardContent, Subscription.Post),
        component: PostCard,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
      Surface.create({
        id: FEED_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof FeedDialog>>(AppSurface.Dialog, FEED_DIALOG),
        component: FeedDialog,
        props: ({ data: { props } }) => ({ ...props }),
      }),
      Surface.create({
        id: 'feedProperties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Subscription.Subscription),
        component: FeedProperties,
        props: ({ data: { subject } }) => ({ subject }),
      }),
    ]),
  ),
);
