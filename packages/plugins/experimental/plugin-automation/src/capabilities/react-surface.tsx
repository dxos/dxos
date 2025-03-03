//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { getSpace, isEchoObject, isSpace, type ReactiveEchoObject } from '@dxos/react-client/echo';

import { AmbientChatDialog, AutomationPanel, ChatContainer, ServiceRegistry } from '../components';
import { AUTOMATION_PLUGIN, AMBIENT_CHAT_DIALOG } from '../meta';
import { AIChatType } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${AUTOMATION_PLUGIN}/ai-chat`,
      role: 'article',
      filter: (data): data is { subject: AIChatType } => data.subject instanceof AIChatType,
      component: ({ data, role }) => <ChatContainer role={role} chat={data.subject} />,
    }),
    createSurface({
      id: `${AUTOMATION_PLUGIN}/service-registry`,
      role: 'complementary--service-registry',
      component: ({ data }) => (
        <ServiceRegistry space={isSpace(data.subject) ? data.subject : getSpace(data.subject)!} />
      ),
    }),
    createSurface({
      id: AMBIENT_CHAT_DIALOG,
      role: 'dialog',
      filter: (data): data is { props: { chat: AIChatType } } => data.component === AMBIENT_CHAT_DIALOG,
      component: ({ data }) => <AmbientChatDialog {...data.props} />,
    }),
    createSurface({
      id: `${AUTOMATION_PLUGIN}/automation`,
      role: 'complementary--automation',
      filter: (data): data is { subject: ReactiveEchoObject<any> } =>
        isEchoObject(data.subject) && !!getSpace(data.subject),
      component: ({ data }) => <AutomationPanel space={getSpace(data.subject)!} object={data.subject} />,
    }),
  ]);
