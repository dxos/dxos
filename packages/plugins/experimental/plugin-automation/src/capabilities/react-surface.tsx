//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { SettingsStore } from '@dxos/local-storage';
import { getSpace, isEchoObject, isSpace, type ReactiveEchoObject } from '@dxos/react-client/echo';

import {
  AssistantDialog,
  AutomationPanel,
  AutomationSettings,
  ChatContainer,
  ServiceRegistry,
  TemplateContainer,
} from '../components';
import { AUTOMATION_PLUGIN, ASSISTANT_DIALOG } from '../meta';
import { AIChatType, type AutomationSettingsProps, TemplateType } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${AUTOMATION_PLUGIN}/settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<AutomationSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === AUTOMATION_PLUGIN,
      component: ({ data: { subject } }) => <AutomationSettings settings={subject.value} />,
    }),
    createSurface({
      id: ASSISTANT_DIALOG,
      role: 'dialog',
      filter: (data): data is { props: { chat: AIChatType } } => data.component === ASSISTANT_DIALOG,
      component: ({ data }) => <AssistantDialog {...data.props} />,
    }),
    createSurface({
      id: `${AUTOMATION_PLUGIN}/chat`,
      role: 'article',
      filter: (data): data is { subject: AIChatType } => data.subject instanceof AIChatType,
      component: ({ data, role }) => <ChatContainer role={role} chat={data.subject} />,
    }),
    createSurface({
      id: `${AUTOMATION_PLUGIN}/template`,
      role: 'article',
      filter: (data): data is { subject: TemplateType } => data.subject instanceof TemplateType,
      component: ({ data, role }) => <TemplateContainer role={role} template={data.subject} />,
    }),
    createSurface({
      id: `${AUTOMATION_PLUGIN}/automation`,
      role: 'complementary--automation',
      filter: (data): data is { subject: ReactiveEchoObject<any> } =>
        isEchoObject(data.subject) && !!getSpace(data.subject),
      component: ({ data }) => <AutomationPanel space={getSpace(data.subject)!} object={data.subject} />,
    }),
    createSurface({
      id: `${AUTOMATION_PLUGIN}/service-registry`,
      role: 'complementary--service-registry',
      component: ({ data }) => (
        <ServiceRegistry space={isSpace(data.subject) ? data.subject : getSpace(data.subject)!} />
      ),
    }),
  ]);
