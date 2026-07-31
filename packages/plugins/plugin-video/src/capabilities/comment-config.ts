//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Type } from '@dxos/echo';

import { Video } from '#types';

const activate = Effect.fnUntraced(function* () {
  // Unanchored: comments attach to the video as a whole. Anchored (range) comments into the
  // transcript/summary text require the comment-sync editor extension, which currently only
  // targets Markdown.Document content.
  return [
    Capability.contribute(AppCapabilities.CommentConfig, {
      id: Type.getTypename(Video.Video),
      comments: 'unanchored',
    }),
  ];
});

export default activate;
