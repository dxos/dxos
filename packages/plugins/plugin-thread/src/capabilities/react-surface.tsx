//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useCapability, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { getSpace } from '@dxos/react-client/echo';
import { Thread } from '@dxos/types';

import { ThreadSettings } from '#components';
import { CallDebugPanel, CallSidebar, ChannelContainer, ChatContainer, ThreadCompanion } from '#containers';
import { meta } from '#meta';
import { Channel, ThreadCapabilities, type Settings } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'channel',
        role: 'article',
        filter: AppSurface.objectArticle(Channel.Channel),
        component: ({ data: { subject, attendableId }, role }) => (
          <ChannelContainer role={role} subject={subject} attendableId={attendableId} />
        ),
      }),
      Surface.create({
        id: 'chat-companion',
        role: 'article',
        filter: AppSurface.and(AppSurface.literalArticle('chat'), AppSurface.companionArticle(Channel.Channel)),
        component: ({ data: { companionTo: channel } }) => {
          const space = getSpace(channel);
          const thread = channel.defaultThread.target;
          if (!space || !thread) {
            return null;
          }

          return <ChatContainer thread={thread} space={space} />;
        },
      }),
      Surface.create({
        id: 'thread',
        role: 'article',
        filter: AppSurface.objectArticle(Thread.Thread),
        component: ({ data: { subject } }) => {
          const space = getSpace(subject);
          if (!space || !subject) {
            return null;
          }

          return <ChatContainer thread={subject} space={space} />;
        },
      }),
      Surface.create({
        id: 'comments',
        role: 'article',
        filter: AppSurface.and(AppSurface.literalArticle('comments'), AppSurface.companionArticle()),
        // TODO(wittjosiah): This isn't scrolling properly in a plank.
        component: ({ data }) => <ThreadCompanion attendableId={data.attendableId} subject={data.companionTo} />,
      }),
      Surface.create({
        id: 'plugin-settings',
        role: 'article',
        filter: AppSurface.settingsArticle(meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <ThreadSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
      Surface.create({
        id: 'assistant',
        role: 'deck-companion--active-call',
        component: () => <CallSidebar />,
      }),
      Surface.create({
        id: 'devtools-overview',
        role: 'devtools-overview',
        component: () => {
          const call = useCapability(ThreadCapabilities.CallManager);
          const state = useAtomValue(call.stateAtom);
          return <CallDebugPanel state={state} />;
        },
      }),
    ]),
  ),
);
