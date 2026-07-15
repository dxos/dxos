//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

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
    ]),
  ),
);
