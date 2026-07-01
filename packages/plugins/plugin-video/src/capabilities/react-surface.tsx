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

const isVideoPart = (data: unknown, part: string): boolean => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const record = data as { attendableId?: unknown; part?: unknown; subject?: unknown };
  return typeof record.attendableId === 'string' && record.part === part && Obj.instanceOf(Video.Video, record.subject);
};

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'article.video',
        // The Section arm must exclude data that has `part` set — those are the internal sub-surfaces
        // dispatched by VideoArticle itself (player/transcript/summary). Without this guard,
        // `article.video` matches its own child slot and VideoArticle renders itself recursively.
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Video.Video),
          AppSurface.object(AppSurface.Section, Video.Video, (data) => !('part' in data)),
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
        filter: AppSurface.oneOf(
          Surface.makeFilter(AppSurface.Section, (data) => isVideoPart(data, 'player')),
          Surface.makeFilter(AppSurface.Tabpanel, (data) => isVideoPart(data, 'player')),
        ),
        component: ({ data }) => <VideoSection subject={data.subject} attendableId={data.attendableId} />,
      }),
      Surface.create({
        id: 'video.transcript',
        filter: AppSurface.oneOf(
          Surface.makeFilter(AppSurface.Section, (data) => isVideoPart(data, 'transcript')),
          Surface.makeFilter(AppSurface.Tabpanel, (data) => isVideoPart(data, 'transcript')),
        ),
        component: ({ data }) => <TranscriptSection subject={data.subject} attendableId={data.attendableId} />,
      }),
      Surface.create({
        id: 'video.summary',
        filter: AppSurface.oneOf(
          Surface.makeFilter(AppSurface.Section, (data) => isVideoPart(data, 'summary')),
          Surface.makeFilter(AppSurface.Tabpanel, (data) => isVideoPart(data, 'summary')),
        ),
        component: ({ data }) => <SummarySection subject={data.subject} attendableId={data.attendableId} />,
      }),
    ]),
  ),
);
