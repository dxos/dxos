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

import { ChannelArticle, ChannelThreadArticle, ThreadArticle } from '#containers';
import { getThreadId } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'channel',
        // A thread's node carries its channel as the subject too, so the channel view has to exclude
        // the nodes scoped to one thread rather than claim every channel article.
        filter: AppSurface.object(AppSurface.Article, Channel.Channel, (data) => !getThreadId(data.properties)),
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
      // A thread opened from its navtree node, as its own plank beside the channel: the same channel
      // subject, scoped by the node's `threadId` (as a mailbox filter node scopes its mailbox).
      Surface.create({
        id: 'channelThread',
        filter: AppSurface.object(AppSurface.Article, Channel.Channel, (data) => !!getThreadId(data.properties)),
        component: ({ data, role }) => {
          const threadId = getThreadId(data.properties);
          return threadId ? <ChannelThreadArticle role={role} subject={data.subject} threadId={threadId} /> : null;
        },
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
