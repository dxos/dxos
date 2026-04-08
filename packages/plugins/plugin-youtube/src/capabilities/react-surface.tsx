//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { ChannelArticle, ChannelSettings, VideoArticle, VideoCard } from '#containers';
import { Channel, Video } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'channel',
        role: ['article'],
        filter: AppSurface.objectArticle(Channel.YouTubeChannel),
        component: ({ data }) => {
          return <ChannelArticle subject={data.subject} attendableId={data.attendableId} />;
        },
      }),
      Surface.create({
id: 'video',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        role: ['article', 'section'],
        filter: AppSurface.and(
          AppSurface.objectArticle(Video.YouTubeVideo),
          AppSurface.companionArticle(Channel.YouTubeChannel),
        ),
        component: ({ data: { attendableId, companionTo, subject }, role }) => {
          return <VideoArticle role={role} subject={subject} companionTo={companionTo} attendableId={attendableId} />;
        },
      }),
      Surface.create({
        id: 'video-card',
        role: 'card--content',
        filter: AppSurface.objectCard(Video.YouTubeVideo),
        component: ({ data: { subject }, role }) => <VideoCard subject={subject} role={role} />,
      }),
      Surface.create({
        id: 'channel.companion.settings',
        role: 'object-settings',
        filter: AppSurface.objectSettings(Channel.YouTubeChannel),
        component: ({ data }) => <ChannelSettings subject={data.subject} />,
      }),
    ]),
  ),
);
