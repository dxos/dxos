//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { GalleryArticle, ImageArtifactArticle } from '#containers';
import { Gallery, ImageArtifact } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'article',
        filter: AppSurface.object(AppSurface.Article, ImageArtifact.ImageArtifact),
        component: ({ role, data }) => (
          <ImageArtifactArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'gallery-article',
        filter: AppSurface.object(AppSurface.Article, Gallery.Gallery),
        component: ({ role, data }) => (
          <GalleryArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
    ]),
  ),
);
