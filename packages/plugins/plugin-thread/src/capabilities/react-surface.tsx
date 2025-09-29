//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';
import { Obj, type Ref } from '@dxos/echo';
import { SettingsStore } from '@dxos/local-storage';
import { getSpace } from '@dxos/react-client/echo';

import {
  CallDebugPanel,
  CallSidebar,
  ChannelContainer,
  ChatContainer,
  ThreadComplementary,
  ThreadSettings,
} from '../components';
import { meta } from '../meta';
import { ChannelType, type ThreadSettingsProps, ThreadType } from '../types';

import { ThreadCapabilities } from './capabilities';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/channel`,
      role: 'article',
      filter: (data): data is { subject: ChannelType } => Obj.instanceOf(ChannelType, data.subject),
      component: ({ data: { subject: channel }, role }) => <ChannelContainer channel={channel} role={role} />,
    }),
    createSurface({
      id: `${meta.id}/chat-companion`,
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
      id: `${meta.id}/thread`,
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
      id: `${meta.id}/comments`,
      role: 'article',
      filter: (data): data is { companionTo: { threads: Ref.Ref<ThreadType>[] } } =>
        data.subject === 'comments' && Obj.isObject(data.companionTo),
      // TODO(wittjosiah): This isn't scrolling properly in a plank.
      component: ({ data }) => <ThreadComplementary subject={data.companionTo} />,
    }),
    createSurface({
      id: `${meta.id}/plugin-settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<ThreadSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === meta.id,
      component: ({ data: { subject } }) => <ThreadSettings settings={subject.value} />,
    }),
    createSurface({
      id: `${meta.id}/assistant`,
      role: 'deck-companion--active-call',
      component: () => <CallSidebar />,
    }),
    createSurface({
      id: `${meta.id}/devtools-overview`,
      role: 'devtools-overview',
      component: () => {
        const call = useCapability(ThreadCapabilities.CallManager);
        return <CallDebugPanel state={call.state} />;
      },
    }),
  ]);
