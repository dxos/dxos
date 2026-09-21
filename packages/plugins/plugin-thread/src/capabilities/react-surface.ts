//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Channel, Thread } from '@dxos/types';

import { ChannelArticle, ThreadArticle } from '#containers';

export const ReactSurface = AppCapability.surface(
  () =>
    Effect.succeed(
      Capability.contribute(Capabilities.ReactSurface, [
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
        // TODO(burdon): Disambiguate with Channel.
        Surface.create({
          id: 'thread',
          filter: AppSurface.object(AppSurface.Article, Thread.Thread),
          component: ThreadArticle,
          props: ({ data: { subject } }) => ({ thread: subject }),
        }),
      ]),
    ),
  {
    roles: ['org.dxos.role.article'],
  },
);
