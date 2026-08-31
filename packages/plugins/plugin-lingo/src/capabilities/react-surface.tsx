//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { FlashcardsArticle, ReaderArticle, VocabularyArticle } from '#containers';
import { Vocabulary } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'vocabularyArticle',
        filter: AppSurface.object(AppSurface.Article, Vocabulary.Vocabulary),
        component: VocabularyArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      // Companion surfaces bind to `companionTo`; `subject` is the variant literal from the graph.
      Surface.create({
        id: 'flashcardsArticle',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'flashcards'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: FlashcardsArticle,
        props: ({ role, data: { attendableId, companionTo } }) => ({ role, attendableId, subject: companionTo }),
      }),
      Surface.create({
        id: 'readerArticle',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'reader'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: ReaderArticle,
        props: ({ role, data: { attendableId, companionTo } }) => ({ role, attendableId, subject: companionTo }),
      }),
    ]),
  ),
);
