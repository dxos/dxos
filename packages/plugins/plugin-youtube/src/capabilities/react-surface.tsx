//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { ChannelArticle, ChannelSettings, VideoArticle, VideoCard } from '#containers';
import { meta } from '#meta';
import { Channel, Video } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}.channel`,
        role: ['article'],
        filter: AppSurface.object(Channel.YouTubeChannel, { attendable: true }),
        component: ({ data }) => {
          return <ChannelArticle subject={data.subject} attendableId={data.attendableId} />;
        },
      }),
      Surface.create({
        id: `${meta.id}.video`,
        role: ['article', 'section'],
        filter: AppSurface.and(
          AppSurface.object(Video.YouTubeVideo, { attendable: true }),
          AppSurface.companion(Channel.YouTubeChannel),
        ),
        component: ({ data: { attendableId, companionTo, subject }, role }) => {
          return <VideoArticle role={role} subject={subject} companionTo={companionTo} attendableId={attendableId} />;
        },
      }),
      Surface.create({
        id: `${meta.id}.video-card`,
        role: 'card--content',
        filter: AppSurface.object(Video.YouTubeVideo),
        component: ({ data: { subject }, role }) => <VideoCard subject={subject} role={role} />,
      }),
      Surface.create({
        id: `${meta.id}.channel.companion.settings`,
        role: 'object-settings',
        filter: AppSurface.object(Channel.YouTubeChannel),
        component: ({ data }) => <ChannelSettings subject={data.subject} />,
      }),
    ]),
  ),
);
