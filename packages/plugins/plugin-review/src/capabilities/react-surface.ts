//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';

import { CommentCount, CommentsArticle } from '#containers';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      // An object's own comments, or a scoped node's (a level of a spec), whose data may not be an object.
      Surface.create({
        id: 'comments',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'comments'),
          AppSurface.companion(AppSurface.Article, (value): value is unknown => value != null),
        ),
        component: CommentsArticle,
        props: ({ data: { attendableId, companionTo } }) => ({ attendableId, subject: companionTo }),
      }),
      Surface.create({
        id: 'commentCount',
        filter: AppSurface.subject(AppSurface.CardMarks, Obj.isObject),
        component: CommentCount,
        props: ({ data: { subject } }) => ({ subject }),
      }),
    ]),
  ),
);
