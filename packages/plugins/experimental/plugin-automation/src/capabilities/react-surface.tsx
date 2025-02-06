//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { getSpace, isEchoObject, type ReactiveEchoObject } from '@dxos/react-client/echo';

import { AssistantPanel, AutomationPanel, ChatContainer } from '../components';
import { AUTOMATION_PLUGIN } from '../meta';
import { GptChatType } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${AUTOMATION_PLUGIN}/assistant`,
      role: 'complementary--assistant',
      component: ({ data }) => <AssistantPanel subject={data.subject} />,
    }),
    createSurface({
      id: `${AUTOMATION_PLUGIN}/automation`,
      role: 'complementary--automation',
      filter: (data): data is { subject: ReactiveEchoObject<any> } =>
        isEchoObject(data.subject) && !!getSpace(data.subject),
      component: ({ data }) => <AutomationPanel space={getSpace(data.subject)!} object={data.subject} />,
    }),
    createSurface({
      id: `${AUTOMATION_PLUGIN}/gpt-chat`,
      role: 'article',
      filter: (data): data is { subject: GptChatType } => data.subject instanceof GptChatType,
      component: ({ data, role }) => <ChatContainer role={role} chat={data.subject} />,
    }),
  ]);
