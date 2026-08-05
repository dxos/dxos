//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
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
        component: ChannelArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'chatCompanion',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'chat'),
          AppSurface.companion(AppSurface.Article, Channel.Channel),
        ),
        component: ChannelArticle,
        props: ({ data: { companionTo } }) => ({ subject: companionTo, chatOnly: true }),
      }),
      // A thread opened from its navtree node, as its own plank beside the channel. The thread holds
      // no channel reference — it lives in that channel's feed — so the container resolves the
      // channel from the node it opened under, the way plugin-inbox resolves a message's mailbox.
      Surface.create({
        id: 'channelThread',
        filter: AppSurface.object(AppSurface.Article, Thread.Thread),
        component: ChannelThreadArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      // TODO(burdon): Disambiguate with Channel.
      Surface.create({
        id: 'thread',
        filter: AppSurface.object(AppSurface.Article, LegacyThread.Thread),
        component: ThreadArticle,
        props: ({ data: { subject } }) => ({ thread: subject }),
      }),
    ]),
  ),
);
