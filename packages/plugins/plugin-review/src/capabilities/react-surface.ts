//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { CommentsArticle } from '#containers';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'comments',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'comments'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: CommentsArticle,
        props: ({ data: { attendableId, companionTo } }) => ({ attendableId, subject: companionTo }),
      }),
    ]),
  ),
);
