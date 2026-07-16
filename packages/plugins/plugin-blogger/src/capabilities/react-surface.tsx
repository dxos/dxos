//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { CommentsArticle } from '@dxos/plugin-comments';
import { Markdown } from '@dxos/plugin-markdown';

import { PostArticle, PublicationArticle } from '#containers';
import { Blog } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'blogger.publication',
        filter: AppSurface.object(AppSurface.Article, Blog.Publication),
        component: ({ data, role }) => (
          <PublicationArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'blogger.post',
        filter: AppSurface.object(AppSurface.Article, Blog.Post),
        component: ({ data, role }) => (
          <PostArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      // Comments companion for a Post plank. Scoped to the `comments` companion variant (the draft's
      // `Markdown.Document` as `subject`) so it fires only for blogger's own companion. NOTE: the id's
      // final segment must be camelCase (`isValidLocalId`, no hyphens) or the surface is silently
      // dropped — then the generic `recordArticle` fallback (subject-only, `position: 'last'`) wins.
      Surface.create({
        id: 'blogger.postComments',
        filter: AppSurface.object(
          AppSurface.Article,
          Markdown.Document,
          (data) => (data as { variant?: string }).variant === 'comments',
        ),
        component: ({ data }) => <CommentsArticle subject={data.subject} attendableId={data.attendableId} />,
      }),
    ]),
  ),
);
