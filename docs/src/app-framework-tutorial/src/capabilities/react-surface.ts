//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';

import { BookmarkArticle } from '../containers/BookmarkArticle.tsx';
import { Bookmark } from '../types/Bookmark.ts';

// #region surface
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(
      Capabilities.ReactSurface,
      Surface.create({
        id: 'article',
        filter: AppSurface.object(AppSurface.Article, Bookmark),
        component: BookmarkArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
    ),
  ),
);
// #endregion
