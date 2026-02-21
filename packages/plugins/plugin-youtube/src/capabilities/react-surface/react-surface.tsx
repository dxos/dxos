//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';

import { ChannelArticle, VideoArticle, VideoCard } from '../../components';
import { meta } from '../../meta';
import { Channel, Video } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}/channel`,
        role: ['article'],
        filter: (data): data is { attendableId?: string; subject: Channel.YouTubeChannel } =>
          Obj.instanceOf(Channel.YouTubeChannel, data.subject),
        component: ({ data }) => {
          return <ChannelArticle subject={data.subject} attendableId={data.attendableId} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/video`,
        role: ['article', 'section'],
        filter: (data): data is { subject: Video.YouTubeVideo; companionTo: Channel.YouTubeChannel } =>
          Obj.instanceOf(Video.YouTubeVideo, data.subject) && Obj.instanceOf(Channel.YouTubeChannel, data.companionTo),
        component: ({ data: { companionTo, subject }, role }) => {
          return <VideoArticle role={role} subject={subject} channel={companionTo} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/video-card`,
        role: 'card--content',
        filter: (data): data is { subject: Video.YouTubeVideo } => Obj.instanceOf(Video.YouTubeVideo, data?.subject),
        component: ({ data: { subject }, role }) => <VideoCard subject={subject} role={role} />,
      }),
    ]),
  ),
);
