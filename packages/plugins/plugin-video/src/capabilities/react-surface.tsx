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
  const d = data as { attendableId?: unknown; part?: unknown; subject?: unknown };
  return typeof d.attendableId === 'string' && d.part === part && Obj.instanceOf(Video.Video, d.subject);
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
        filter: {
          bindings: [
            { role: AppSurface.Section.role, guard: (data) => isVideoPart(data, 'player') },
            { role: AppSurface.Tabpanel.role, guard: (data) => isVideoPart(data, 'player') },
          ],
        } satisfies Surface.Filter<{ subject: Video.Video; attendableId: string; part: 'player' }>,
        component: ({ data }) => <VideoSection subject={data.subject} attendableId={data.attendableId} />,
      }),
      Surface.create({
        id: 'video.transcript',
        filter: {
          bindings: [
            { role: AppSurface.Section.role, guard: (data) => isVideoPart(data, 'transcript') },
            { role: AppSurface.Tabpanel.role, guard: (data) => isVideoPart(data, 'transcript') },
          ],
        } satisfies Surface.Filter<{ subject: Video.Video; attendableId: string; part: 'transcript' }>,
        component: ({ data }) => <TranscriptSection subject={data.subject} attendableId={data.attendableId} />,
      }),
      Surface.create({
        id: 'video.summary',
        filter: {
          bindings: [
            { role: AppSurface.Section.role, guard: (data) => isVideoPart(data, 'summary') },
            { role: AppSurface.Tabpanel.role, guard: (data) => isVideoPart(data, 'summary') },
          ],
        } satisfies Surface.Filter<{ subject: Video.Video; attendableId: string; part: 'summary' }>,
        component: ({ data }) => <SummarySection subject={data.subject} attendableId={data.attendableId} />,
      }),
    ]),
  ),
);
