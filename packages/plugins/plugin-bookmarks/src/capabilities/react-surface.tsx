//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { BookmarkArticle, BookmarkCard } from '#containers';
import { Bookmark } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.provide(Capabilities.ReactSurface, [
      Surface.create({
        id: 'bookmarkArticle',
        filter: AppSurface.object(AppSurface.Article, Bookmark.Bookmark),
        component: ({ data, role }) => (
          <BookmarkArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'bookmarkCard',
        filter: AppSurface.object(AppSurface.CardContent, Bookmark.Bookmark),
        component: ({ data, role }) => <BookmarkCard role={role} subject={data.subject} />,
      }),
    ]),
  ]),
);
