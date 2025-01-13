//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, isLayoutParts, useCapability } from '@dxos/app-framework';
import { type Ref } from '@dxos/echo-schema';
import { ChannelType, type ThreadType } from '@dxos/plugin-space/types';
import { fullyQualifiedId, getSpace } from '@dxos/react-client/echo';

import { ThreadCapabilities } from './capabilities';
import { ThreadArticle, ThreadComplementary, ThreadSettings } from '../components';
import { THREAD_PLUGIN } from '../meta';
import { type ThreadSettingsProps } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${THREAD_PLUGIN}/channel`,
      role: 'article',
      filter: (data): data is { subject: ChannelType } =>
        data.subject instanceof ChannelType && !!data.subject.threads[0],
      component: ({ data }) => {
        const location = useCapability(Capabilities.Location);
        const channel = data.subject;
        const thread = channel.threads[0].target!;
        // TODO(zan): Maybe we should have utility for positional main object ids.
        if (isLayoutParts(location?.active) && location.active.main) {
          const layoutEntries = location.active.main;
          const currentPosition = layoutEntries.findIndex((entry) => channel.id === entry.id);
          if (currentPosition > 0) {
            const objectToTheLeft = layoutEntries[currentPosition - 1];
            const context = getSpace(channel)?.db.getObjectById(objectToTheLeft.id);
            return <ThreadArticle thread={thread} context={context} />;
          }
        }

        return <ThreadArticle thread={thread} />;
      },
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
      component: ({ data }) => {
        const { state, getViewState } = useCapability(ThreadCapabilities.MutableState);
        const { showResolvedThreads } = getViewState(fullyQualifiedId(data.subject));

        return (
          <ThreadComplementary
            subject={data.subject}
            drafts={state.drafts[fullyQualifiedId(data.subject)]}
            current={state.current}
            showResolvedThreads={showResolvedThreads}
          />
        );
      },
    }),
    createSurface({
      id: `${THREAD_PLUGIN}/settings`,
      role: 'settings',
      filter: (data): data is any => data.plugin === THREAD_PLUGIN,
      component: () => {
        const settings = useCapability(Capabilities.SettingsStore).getStore<ThreadSettingsProps>(THREAD_PLUGIN)!.value;
        return <ThreadSettings settings={settings} />;
      },
    }),
  ]);
