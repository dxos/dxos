//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';
import { type Ref } from '@dxos/echo-schema';
import { SettingsStore } from '@dxos/local-storage';
import { type ThreadType } from '@dxos/plugin-space/types';
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
import { ChannelType, type ThreadSettingsProps } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${THREAD_PLUGIN}/channel`,
      role: 'article',
      filter: (data): data is { subject: ChannelType } => data.subject instanceof ChannelType,
      component: ({ data: { subject: channel }, role }) => <ChannelContainer channel={channel} role={role} />,
    }),
    createSurface({
      id: `${THREAD_PLUGIN}/chat-companion`,
      role: 'article',
      filter: (data): data is { companionTo: ChannelType; subject: 'chat' } =>
        data.companionTo instanceof ChannelType && data.subject === 'chat',
      component: ({ data: { companionTo: channel } }) => {
        const space = getSpace(channel);
        if (!space) {
          return null;
        }

        return <ChatContainer dxn={channel.queue.dxn} space={space} />;
      },
    }),
    createSurface({
      id: `${THREAD_PLUGIN}/comments`,
      role: 'article',
      filter: (data): data is { companionTo: { threads: Ref<ThreadType>[] } } =>
        data.subject === 'comments' &&
        !!data.companionTo &&
        typeof data.companionTo === 'object' &&
        'threads' in data.companionTo &&
        Array.isArray(data.companionTo.threads),
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
