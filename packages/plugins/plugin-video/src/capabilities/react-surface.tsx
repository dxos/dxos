//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';

import { TranscriptArticle, VideoArticle } from '#containers';
import { Video } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'article.video',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Video.Video),
          AppSurface.object(AppSurface.Section, Video.Video),
        ),
        component: ({ data, role }) => (
          <VideoArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      // Transcript/summary surface, embedded below the video player (see VideoArticle).
      Surface.create({
        id: 'transcript.video',
        role: 'transcript',
        filter: (data): data is { subject: Video.Video; attendableId: string } =>
          Obj.instanceOf(Video.Video, data.subject),
        component: ({ data, role }) => (
          <TranscriptArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
    ]),
  ),
);
