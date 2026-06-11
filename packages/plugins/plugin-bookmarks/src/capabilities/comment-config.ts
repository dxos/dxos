//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';

import { Bookmark } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Unanchored: comments attach to the bookmark as a whole. Anchored (range) comments require the
    // comment-sync editor extension, which currently only targets Markdown.Document content.
    return Capability.contributes(AppCapabilities.CommentConfig, {
      id: Type.getTypename(Bookmark.Bookmark),
      comments: 'unanchored',
    });
  }),
);
