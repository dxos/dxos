//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Type } from '@dxos/echo';

import { Bookmark } from '#types';

const activate = Effect.fnUntraced(function* () {
  // Unanchored: comments attach to the bookmark as a whole. Anchored (range) comments require the
  // comment-sync editor extension, which currently only targets Markdown.Document content.
  return Capability.contributes(AppCapabilities.CommentConfig, {
    id: Type.getTypename(Bookmark.Bookmark),
    comments: 'unanchored',
  });
});

export default activate;
