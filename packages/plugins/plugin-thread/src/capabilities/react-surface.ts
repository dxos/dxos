//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Channel, Thread } from '@dxos/types';

import { ChannelArticle } from '#containers';

import { ThreadArticleSurface } from './ThreadArticleSurface';

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
      // TODO(burdon): Disambiguate with Channel.
      Surface.create({
        id: 'thread',
        filter: AppSurface.object(AppSurface.Article, Thread.Thread),
        component: ThreadArticleSurface,
        props: ({ data: { subject } }) => ({ subject }),
      }),
    ]),
  ),
);
