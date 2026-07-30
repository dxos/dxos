//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { getParentId } from '@dxos/plugin-graph';
import { useNode } from '@dxos/plugin-graph/hooks';
import { getSpace } from '@dxos/react-client/echo';
// The legacy pre-Channel thread object, which plugin-review still owns comments through; distinct
// from this plugin's `Thread`, which is a thread of a channel feed.
import { Channel, Thread as LegacyThread } from '@dxos/types';

import { ChannelArticle, ChannelThreadArticle, ThreadArticle } from '#containers';
import { Thread } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
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
      // A thread opened from its navtree node, as its own plank beside the channel. The thread holds
      // no channel reference — it lives in that channel's feed — so the channel is the object of the
      // node it opened under, the way plugin-inbox resolves a message's mailbox.
      Surface.create({
        id: 'channelThread',
        filter: AppSurface.object(AppSurface.Article, Thread.Thread),
        component: ({ data, role }) => {
          const { graph } = useAppGraph();
          const parent = useNode(graph, getParentId(data.attendableId));
          const channel = Channel.instanceOf(parent?.data) ? parent.data : undefined;
          return <ChannelThreadArticle role={role} subject={data.subject} channel={channel} />;
        },
      }),
      // TODO(burdon): Disambiguate with Channel.
      Surface.create({
        id: 'thread',
        filter: AppSurface.object(AppSurface.Article, LegacyThread.Thread),
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
