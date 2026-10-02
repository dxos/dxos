//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { CommentsArticle } from '@dxos/plugin-review';

import { PostArticle, PublicationArticle } from '#containers';
import { Blog } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.Root.create({
        id: 'blogger.publication',
        filter: AppSurface.object(AppSurface.Article, Blog.Publication),
        component: PublicationArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.Root.create({
        id: 'blogger.post',
        filter: AppSurface.object(AppSurface.Article, Blog.Post),
        component: PostArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      // Comments companion for a Post plank. Scoped to the `comments` companion variant (the draft's
      // `Markdown.Document` as `subject`) so it fires only for blogger's own companion.
      Surface.Root.create({
        id: 'blogger.postComments',
        filter: AppSurface.object(
          AppSurface.Article,
          Markdown.Document,
          (data) => (data as { variant?: string }).variant === 'comments',
        ),
        component: CommentsArticle,
        props: ({ data: { subject, attendableId } }) => ({ subject, attendableId }),
      }),
    ]),
  ),
);
