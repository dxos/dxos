//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { BookmarkArticle, BookmarkCard } from '#containers';
import { Bookmark } from '#types';

export const ReactSurface = AppCapability.surface(
  () =>
    Effect.succeed(
      Capability.contribute(Capabilities.ReactSurface, [
        Surface.create({
          id: 'bookmarkArticle',
          filter: AppSurface.object(AppSurface.Article, Bookmark.Bookmark),
          component: BookmarkArticle,
          props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
        }),
        Surface.create({
          id: 'bookmarkCard',
          filter: AppSurface.object(AppSurface.CardContent, Bookmark.Bookmark),
          component: BookmarkCard,
          props: ({ role, data: { subject } }) => ({ role, subject }),
        }),
      ]),
    ),
  {
    roles: ['org.dxos.role.article', 'org.dxos.role.cardContent'],
  },
);
