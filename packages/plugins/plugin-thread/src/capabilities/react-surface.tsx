//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useCapability, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit';
import { Obj, type Ref } from '@dxos/echo';
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
        id: `${meta.id}.channel`,
        role: 'article',
        filter: AppSurface.subject(Channel.Channel, { attendable: true }),
        component: ({ data: { subject, attendableId }, role }) => (
          <ChannelContainer role={role} subject={subject} attendableId={attendableId} />
        ),
      }),
      Surface.create({
        id: `${meta.id}.chat-companion`,
        role: 'article',
        filter: AppSurface.companion(Channel.Channel, 'chat'),
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
        id: `${meta.id}.thread`,
        role: 'article',
        filter: AppSurface.subject(Thread.Thread, { attendable: true }),
        component: ({ data: { subject } }) => {
          const space = getSpace(subject);
          if (!space || !subject) {
            return null;
          }

          return <ChatContainer thread={subject} space={space} />;
        },
      }),
      Surface.create({
        id: `${meta.id}.comments`,
        role: 'article',
        filter: (data): data is { attendableId?: string; companionTo: { threads: Ref.Ref<Thread.Thread>[] } } =>
          data.subject === 'comments' && Obj.isObject(data.companionTo),
        // TODO(wittjosiah): This isn't scrolling properly in a plank.
        component: ({ data }) => <ThreadCompanion attendableId={data.attendableId} subject={data.companionTo} />,
      }),
      Surface.create({
        id: `${meta.id}.plugin-settings`,
        role: 'article',
        filter: AppSurface.settings(meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <ThreadSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
      Surface.create({
        id: `${meta.id}.assistant`,
        role: 'deck-companion--active-call',
        component: () => <CallSidebar />,
      }),
      Surface.create({
        id: `${meta.id}.devtools-overview`,
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
