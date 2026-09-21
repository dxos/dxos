//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Type } from '@dxos/echo';

import { Bookmark } from '#types';
import { BookmarksEvents } from '#types';

export const CommentConfig = AppCapability.commentConfig(
  Effect.fnUntraced(function* () {
    // Unanchored: comments attach to the bookmark as a whole. Anchored (range) comments require the
    // comment-sync editor extension, which currently only targets Markdown.Document content.
    return [
      Capability.contribute(AppCapabilities.CommentConfig, {
        id: Type.getTypename(Bookmark.Bookmark),
        comments: 'unanchored',
      }),
    ];
  }),
  {
    activatesOn: BookmarksEvents.Start,
  },
);
