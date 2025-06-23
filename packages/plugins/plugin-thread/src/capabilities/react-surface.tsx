//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';
import { Obj, type Ref } from '@dxos/echo';
import { SettingsStore } from '@dxos/local-storage';
import { getSpace } from '@dxos/react-client/echo';

import { ThreadCapabilities } from './capabilities';
import {
  CallSidebar,
  CallDebugPanel,
  ChannelContainer,
  ThreadComplementary,
  ThreadSettings,
  ChatContainer,
} from '../components';
import { THREAD_PLUGIN } from '../meta';
import { ChannelType, ThreadType, type ThreadSettingsProps } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${THREAD_PLUGIN}/channel`,
      role: 'article',
      filter: (data): data is { subject: ChannelType } => Obj.instanceOf(ChannelType, data.subject),
      component: ({ data: { subject: channel }, role }) => <ChannelContainer channel={channel} role={role} />,
    }),
    createSurface({
      id: `${THREAD_PLUGIN}/chat-companion`,
      role: 'article',
      filter: (data): data is { companionTo: ChannelType; subject: 'chat' } =>
        Obj.instanceOf(ChannelType, data.companionTo) && data.subject === 'chat',
      component: ({ data: { companionTo: channel } }) => {
        const space = getSpace(channel);
        const thread = channel.defaultThread.target;
        if (!space || !thread) {
          return null;
        }

        return <ChatContainer thread={thread} space={space} />;
      },
    }),
    createSurface({
      id: `${THREAD_PLUGIN}/thread`,
      role: 'article',
      filter: (data): data is { subject: ThreadType } => Obj.instanceOf(ThreadType, data.subject),
      component: ({ data: { subject: thread } }) => {
        const space = getSpace(thread);
        if (!space || !thread) {
          return null;
        }

        return <ChatContainer thread={thread} space={space} />;
      },
    }),
    createSurface({
      id: `${THREAD_PLUGIN}/comments`,
      role: 'article',
      filter: (data): data is { companionTo: { threads: Ref.Ref<ThreadType>[] } } =>
        data.subject === 'comments' && Obj.isObject(data.companionTo),
      // TODO(wittjosiah): This isn't scrolling properly in a plank.
      component: ({ data }) => <ThreadComplementary subject={data.companionTo} />,
    }),
    createSurface({
      id: `${THREAD_PLUGIN}/plugin-settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<ThreadSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === THREAD_PLUGIN,
      component: ({ data: { subject } }) => <ThreadSettings settings={subject.value} />,
    }),
    createSurface({
      id: `${THREAD_PLUGIN}/assistant`,
      role: 'deck-companion--active-call',
      component: () => <CallSidebar />,
    }),
    createSurface({
      id: `${THREAD_PLUGIN}/devtools-overview`,
      role: 'devtools-overview',
      component: () => {
        const call = useCapability(ThreadCapabilities.CallManager);
        return <CallDebugPanel state={call.state} />;
      },
    }),
  ]);
