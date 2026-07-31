//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { getSpace } from '@dxos/react-client/echo';
import { Channel, Thread } from '@dxos/types';

import { ChannelArticle, ThreadArticle } from '#containers';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'channel',
        filter: AppSurface.object(AppSurface.Article, Channel.Channel),
        component: ({ data: { subject, attendableId }, role }) => (
          <ChannelArticle role={role} subject={subject} attendableId={attendableId} />
        ),
      }),
      Surface.create({
        id: 'chatCompanion',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'chat'),
          AppSurface.companion(AppSurface.Article, Channel.Channel),
        ),
        component: ({ data: { companionTo: channel } }) => <ChannelArticle subject={channel} chatOnly />,
      }),
      // TODO(burdon): Disambiguate with Channel.
      Surface.create({
        id: 'thread',
        filter: AppSurface.object(AppSurface.Article, Thread.Thread),
        component: ({ data: { subject } }) => {
          const space = getSpace(subject);
          if (!space || !subject) {
            return null;
          }

          return <ThreadArticle space={space} thread={subject} />;
        },
      }),
    ]),
  ),
);
