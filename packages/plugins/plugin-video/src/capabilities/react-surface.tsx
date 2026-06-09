//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';

import { SummarySection, TranscriptSection, VideoArticle, VideoSection } from '#containers';
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
      // The three parts of a video, each isolated in its own surface (roles 'section' + 'tabpanel') so
      // the cross-origin player iframe never shares a component/prop graph with the CodeMirror editors.
      // Discriminated by `data.part`; composed by VideoArticle.
      Surface.create({
        id: 'video.player',
        role: ['section', 'tabpanel'],
        filter: (data): data is { subject: Video.Video; attendableId: string; part: 'player' } =>
          typeof data.attendableId === 'string' && data.part === 'player' && Obj.instanceOf(Video.Video, data.subject),
        component: ({ data }) => <VideoSection subject={data.subject} attendableId={data.attendableId} />,
      }),
      Surface.create({
        id: 'video.transcript',
        role: ['section', 'tabpanel'],
        filter: (data): data is { subject: Video.Video; attendableId: string; part: 'transcript' } =>
          typeof data.attendableId === 'string' &&
          data.part === 'transcript' &&
          Obj.instanceOf(Video.Video, data.subject),
        component: ({ data }) => <TranscriptSection subject={data.subject} attendableId={data.attendableId} />,
      }),
      Surface.create({
        id: 'video.summary',
        role: ['section', 'tabpanel'],
        filter: (data): data is { subject: Video.Video; attendableId: string; part: 'summary' } =>
          typeof data.attendableId === 'string' && data.part === 'summary' && Obj.instanceOf(Video.Video, data.subject),
        component: ({ data }) => <SummarySection subject={data.subject} attendableId={data.attendableId} />,
      }),
    ]),
  ),
);
