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

import { Bookmark } from '#types';

const activate = Effect.fnUntraced(function* () {
  // Unanchored: comments attach to the bookmark as a whole. Anchored (range) comments require the
  // comment-sync editor extension, which currently only targets Markdown.Document content.
  return [
    Capability.provide(AppCapabilities.CommentConfig, {
      id: Type.getTypename(Bookmark.Bookmark),
      comments: 'unanchored',
    }),
  ];
});

export default activate;
