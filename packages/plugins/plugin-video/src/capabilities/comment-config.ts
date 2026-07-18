//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';

import { Video } from '#types';

const activate = Effect.fnUntraced(function* () {
  // Unanchored: comments attach to the video as a whole. Anchored (range) comments into the
  // transcript/summary text require the comment-sync editor extension, which currently only
  // targets Markdown.Document content.
  return [
    Capability.provide(AppCapabilities.CommentConfig, {
      id: Type.getTypename(Video.Video),
      comments: 'unanchored',
    }),
  ];
});

export default activate;
