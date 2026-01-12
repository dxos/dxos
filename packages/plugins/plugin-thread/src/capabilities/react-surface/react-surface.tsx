//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';
import { Obj, type Ref } from '@dxos/echo';
import { SettingsStore } from '@dxos/local-storage';
import { getSpace } from '@dxos/react-client/echo';
import { Thread } from '@dxos/types';

import {
  CallDebugPanel,
  CallSidebar,
  ChannelContainer,
  ChatContainer,
  ThreadCompanion,
  ThreadSettings,
} from '../../components';
import { meta } from '../../meta';
import { Channel, ThreadCapabilities, type ThreadSettingsProps } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      Common.createSurface({
        id: `${meta.id}/channel`,
        role: 'article',
        filter: (data): data is { subject: Channel.Channel } => Obj.instanceOf(Channel.Channel, data.subject),
        component: ({ data: { subject }, role }) => <ChannelContainer channel={subject} role={role} />,
      }),
      Common.createSurface({
        id: `${meta.id}/chat-companion`,
        role: 'article',
        filter: (data): data is { companionTo: Channel.Channel; subject: 'chat' } =>
          Obj.instanceOf(Channel.Channel, data.companionTo) && data.subject === 'chat',
        component: ({ data: { companionTo: channel } }) => {
          const space = getSpace(channel);
          const thread = channel.defaultThread.target;
          if (!space || !thread) {
            return null;
          }

          return <ChatContainer thread={thread} space={space} />;
        },
      }),
      Common.createSurface({
        id: `${meta.id}/thread`,
        role: 'article',
        filter: (data): data is { subject: Thread.Thread } => Obj.instanceOf(Thread.Thread, data.subject),
        component: ({ data: { subject } }) => {
          const space = getSpace(subject);
          if (!space || !subject) {
            return null;
          }

          return <ChatContainer thread={subject} space={space} />;
        },
      }),
      Common.createSurface({
        id: `${meta.id}/comments`,
        role: 'article',
        filter: (data): data is { companionTo: { threads: Ref.Ref<Thread.Thread>[] } } =>
          data.subject === 'comments' && Obj.isObject(data.companionTo),
        // TODO(wittjosiah): This isn't scrolling properly in a plank.
        component: ({ data }) => <ThreadCompanion subject={data.companionTo} />,
      }),
      Common.createSurface({
        id: `${meta.id}/plugin-settings`,
        role: 'article',
        filter: (data): data is { subject: SettingsStore<ThreadSettingsProps> } =>
          data.subject instanceof SettingsStore && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => <ThreadSettings settings={subject.value} />,
      }),
      Common.createSurface({
        id: `${meta.id}/assistant`,
        role: 'deck-companion--active-call',
        component: () => <CallSidebar />,
      }),
      Common.createSurface({
        id: `${meta.id}/devtools-overview`,
        role: 'devtools-overview',
        component: () => {
          const call = useCapability(ThreadCapabilities.CallManager);
          return <CallDebugPanel state={call.state} />;
        },
      }),
    ]),
  ),
);
