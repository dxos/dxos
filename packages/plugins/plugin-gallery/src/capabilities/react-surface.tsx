//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';

import { GalleryArticle, GalleryShow } from '#containers';
import { meta } from '#meta';
import { Gallery } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'article',
        filter: AppSurface.object(AppSurface.Article, Gallery.Gallery),
        component: ({ data, role }) => (
          <GalleryArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'show',
        position: 'hoist',
        filter: AppSurface.predicate(
          AppSurface.Article,
          (data): data is AppSurface.ArticleData<{ type: typeof meta.id; object: Gallery.Gallery }> =>
            !!data.subject &&
            typeof data.subject === 'object' &&
            'type' in data.subject &&
            'object' in data.subject &&
            data.subject.type === meta.id &&
            Obj.instanceOf(Gallery.Gallery, data.subject.object),
        ),
        component: ({ data }) => <GalleryShow gallery={data.subject.object} />,
      }),
    ]),
  ),
);
