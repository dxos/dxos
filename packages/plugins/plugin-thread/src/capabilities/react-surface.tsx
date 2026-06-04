//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { getSpace } from '@dxos/react-client/echo';
import { Channel, Thread } from '@dxos/types';

import { ThreadSettings } from '#components';
import { ChannelChat, ChannelArticle, CommentsCompanion, ThreadContainer } from '#containers';
import { meta } from '#meta';
import { type Settings } from '#types';

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
        component: ({ data: { companionTo: channel } }) => {
          const space = getSpace(channel);
          if (!space) {
            return null;
          }

          return <ChannelChat channel={channel} space={space} />;
        },
      }),
      Surface.create({
        id: 'thread',
        filter: AppSurface.object(AppSurface.Article, Thread.Thread),
        component: ({ data: { subject } }) => {
          const space = getSpace(subject);
          if (!space || !subject) {
            return null;
          }

          return <ThreadContainer thread={subject} space={space} />;
        },
      }),
      Surface.create({
        id: 'comments',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'comments'),
          AppSurface.companion(AppSurface.Article),
        ),
        // TODO(wittjosiah): This isn't scrolling properly in a plank.
        component: ({ data }) => <CommentsCompanion attendableId={data.attendableId} subject={data.companionTo} />,
      }),
      Surface.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <ThreadSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
    ]),
  ),
);
