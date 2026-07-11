//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Position } from '@dxos/util';

import { BookArticle, BookCard } from '#containers';
import { Book } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'bookArticle',
        filter: AppSurface.object(AppSurface.Article, Book.Book),
        component: ({ data, role }) => (
          <BookArticle subject={data.subject} role={role} attendableId={data.attendableId} />
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
