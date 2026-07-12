//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Position } from '@dxos/util';

import { BookArticle, BookCard, BookNotesCompanion } from '#containers';
import { Book } from '#types';

import { NOTES_COMPANION_VARIANT } from './app-graph-builder';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'bookArticle',
        // The main article only — not a companion plank (which carries a `variant`).
        filter: AppSurface.object(AppSurface.Article, Book.Book, (data) => !data.variant),
        component: ({ data, role }) => (
          <BookArticle subject={data.subject} role={role} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'bookNotesCompanion',
        // Bound to its own companion segment (`linkedSegment('notes')`), distinct from the atproto
        // publishing companion of the same book.
        filter: AppSurface.allOf(
          AppSurface.object(AppSurface.Article, Book.Book, (data) => data.variant === NOTES_COMPANION_VARIANT),
          AppSurface.companion(AppSurface.Article),
        ),
        component: ({ data, role }) => (
          <BookNotesCompanion subject={data.subject} role={role} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'bookCard',
        position: Position.first,
        filter: AppSurface.object(AppSurface.CardContent, Book.Book),
        component: ({ data, role }) => <BookCard subject={data.subject} role={role} />,
      }),
    ]),
  ),
);
