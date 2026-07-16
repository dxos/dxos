//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { CommentsArticle } from '@dxos/plugin-comments';
import { Markdown } from '@dxos/plugin-markdown';

import { PostArticle, PublicationArticle } from '#containers';
import { Blog } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      // DEBUG: log-only probe (never renders) to inspect the actual companion surface data — why does
      // `blogger.post-comments` not match? Runs its guard for every Article surface; logs companions.
      Surface.create({
        id: 'blogger.debug-probe',
        filter: {
          bindings: [
            {
              role: AppSurface.Article.role,
              guard: (data: any) => {
                // eslint-disable-next-line no-console
                console.warn('[blogger probe] Article surface data', {
                  subjectType: Obj.getTypename(data?.subject),
                  isMarkdownDoc: Obj.instanceOf(Markdown.Document, data?.subject),
                  isObject: Obj.isObject(data?.subject),
                  variant: data?.variant,
                  companionToType: data?.companionTo ? Obj.getTypename(data.companionTo) : undefined,
                });
                return false;
              },
            },
          ],
        },
        component: () => null,
      }),
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
      // `Markdown.Document` as `subject`) so it fires only for blogger's own companion. NOTE: does not
      // use `companion(Blog.Post)` — the generic `recordArticle` fallback (subject-only match) would
      // otherwise win — and beats `recordArticle` because that surface is `position: 'last'`.
      Surface.create({
        id: 'blogger.post-comments',
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
