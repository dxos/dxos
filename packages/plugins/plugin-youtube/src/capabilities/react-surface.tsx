//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';

import { ChannelArticle, ChannelSettings, VideoArticle, VideoCard } from '#containers';
import { meta } from '#meta';
import { Channel, Video } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}.channel`,
        role: ['article'],
        filter: (data): data is { attendableId?: string; subject: Channel.YouTubeChannel } =>
          Channel.instanceOf(data.subject),
        component: ({ data }) => {
          return <ChannelArticle subject={data.subject} attendableId={data.attendableId} />;
        },
      }),
      Surface.create({
        id: `${meta.id}.video`,
        role: ['article', 'section'],
        filter: (
          data,
        ): data is { attendableId: string; subject: Video.YouTubeVideo; companionTo: Channel.YouTubeChannel } =>
          typeof data.attendableId === 'string' &&
          Video.instanceOf(data.subject) &&
          Channel.instanceOf(data.companionTo),
        component: ({ data: { attendableId, companionTo, subject }, role }) => {
          return <VideoArticle role={role} subject={subject} companionTo={companionTo} attendableId={attendableId} />;
        },
      }),
      Surface.create({
        id: `${meta.id}.video-card`,
        role: 'card--content',
        filter: (data): data is { subject: Video.YouTubeVideo } => Video.instanceOf(data?.subject),
        component: ({ data: { subject }, role }) => <VideoCard subject={subject} role={role} />,
      }),
      Surface.create({
        id: `${meta.id}.channel.companion.settings`,
        role: 'object-settings',
        filter: (data): data is { subject: Channel.YouTubeChannel } => Channel.instanceOf(data.subject),
        component: ({ data }) => <ChannelSettings subject={data.subject} />,
      }),
    ]),
  ),
);
