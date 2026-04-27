//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { ChannelArticle, ChannelProperties, VideoArticle, VideoCard } from '#containers';
import { Channel, Video } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'channel',
        filter: AppSurface.object(AppSurface.Article, Channel.YouTubeChannel),
        component: ({ data }) => {
          return <ChannelArticle subject={data.subject} attendableId={data.attendableId} />;
        },
      }),
      Surface.create({
        id: 'video',
        filter: AppSurface.oneOf(
          AppSurface.allOf(
            AppSurface.object(AppSurface.Article, Video.YouTubeVideo),
            AppSurface.companion(AppSurface.Article, Channel.YouTubeChannel),
          ),
          AppSurface.allOf(
            AppSurface.object(AppSurface.Section, Video.YouTubeVideo),
            AppSurface.companion(AppSurface.Section, Channel.YouTubeChannel),
          ),
        ),
        component: ({ data: { attendableId, companionTo, subject }, role }) => {
          return <VideoArticle role={role} subject={subject} companionTo={companionTo} attendableId={attendableId} />;
        },
      }),
      Surface.create({
        id: 'video-card',
        filter: AppSurface.object(AppSurface.Card, Video.YouTubeVideo),
        component: ({ data: { subject }, role }) => <VideoCard subject={subject} role={role} />,
      }),
      Surface.create({
        id: 'channel-properties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Channel.YouTubeChannel),
        component: ({ data }) => <ChannelProperties subject={data.subject} />,
      }),
    ]),
  ),
);
