//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useLayout } from '@dxos/app-framework';
import { type Ref } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { SettingsStore } from '@dxos/local-storage';
import { ChannelType, type ThreadType } from '@dxos/plugin-space/types';
import { getSpace, isSpace, type Space } from '@dxos/react-client/echo';

import { ChatContainer, ThreadComplementary, ThreadSettings } from '../components';
import { THREAD_PLUGIN } from '../meta';
import { type ThreadSettingsProps } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${THREAD_PLUGIN}/channel`,
      role: 'article',
      filter: (data): data is { subject: ChannelType } => data.subject instanceof ChannelType,
      component: ({ data: { subject: channel }, role }) => {
        const layout = useLayout();
        const currentPosition = layout.active.findIndex((id) => id === channel.id);
        const objectToTheLeft = layout.active[currentPosition - 1];
        const context = currentPosition > 0 ? getSpace(channel)?.db.getObjectById(objectToTheLeft) : undefined;
        const space = getSpace(channel);
        if (!space) {
          return null;
        }

        return <ChatContainer space={space} dxn={channel.queue.dxn} context={context} />;
      },
    }),
    createSurface({
      id: `${THREAD_PLUGIN}/tabpanel`,
      role: 'tabpanel',
      filter: (data): data is { subject: DXN; space: Space } =>
        data.subject instanceof DXN && data.type === 'chat' && isSpace(data.space),
      component: ({ data: { subject: dxn, space } }) => <ChatContainer dxn={dxn} space={space} />,
    }),
    createSurface({
      id: `${THREAD_PLUGIN}/thread`,
      role: 'complementary--comments',
      filter: (data): data is { subject: { threads: Ref<ThreadType>[] } } =>
        !!data.subject &&
        typeof data.subject === 'object' &&
        'threads' in data.subject &&
        Array.isArray(data.subject.threads) &&
        !(data.subject instanceof ChannelType),
      component: ({ data }) => <ThreadComplementary subject={data.subject} />,
    }),
    createSurface({
      id: `${THREAD_PLUGIN}/settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<ThreadSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === THREAD_PLUGIN,
      component: ({ data: { subject } }) => <ThreadSettings settings={subject.value} />,
    }),
  ]);
