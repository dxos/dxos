//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { getTypename } from '@dxos/live-object';
import { SettingsStore } from '@dxos/local-storage';
import { fullyQualifiedId, isReactiveObject, isSpace, type Space } from '@dxos/react-client/echo';

import { AssistantDialog, AssistantSettings, ChatContainer, ServiceRegistry, TemplateContainer } from '../components';
import { ASSISTANT_PLUGIN, ASSISTANT_DIALOG } from '../meta';
import { AIChatType, type AssistantSettingsProps, TemplateType } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${ASSISTANT_PLUGIN}/plugin-settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<AssistantSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === ASSISTANT_PLUGIN,
      component: ({ data: { subject } }) => <AssistantSettings settings={subject.value} />,
    }),
    createSurface({
      id: ASSISTANT_DIALOG,
      role: 'dialog',
      filter: (data): data is { props: { chat: AIChatType } } => data.component === ASSISTANT_DIALOG,
      component: ({ data }) => <AssistantDialog {...data.props} />,
    }),
    createSurface({
      id: `${ASSISTANT_PLUGIN}/chat`,
      role: 'article',
      filter: (data): data is { subject: AIChatType; variant: undefined } =>
        isInstanceOf(AIChatType, data.subject) && data.variant !== 'assistant-chat',
      component: ({ data, role }) => <ChatContainer role={role} chat={data.subject} />,
    }),
    createSurface({
      id: `${ASSISTANT_PLUGIN}/object-chat`,
      role: 'article',
      filter: (data): data is { companionTo: AIChatType; subject: 'assistant-chat' } =>
        isReactiveObject(data.companionTo) && data.companionTo.assistantChatQueue && data.subject === 'assistant-chat',
      component: ({ data, role }) => {
        const associatedArtifact = useMemo(
          () => ({
            id: fullyQualifiedId(data.companionTo),
            typename: getTypename(data.companionTo) ?? 'unknown',
          }),
          [data.companionTo],
        );
        return <ChatContainer role={role} chat={data.companionTo} associatedArtifact={associatedArtifact} />;
      },
    }),
    createSurface({
      id: `${ASSISTANT_PLUGIN}/template`,
      role: 'article',
      filter: (data): data is { subject: TemplateType } => isInstanceOf(TemplateType, data.subject),
      component: ({ data, role }) => <TemplateContainer role={role} template={data.subject} />,
    }),
    createSurface({
      id: `${ASSISTANT_PLUGIN}/service-registry`,
      role: 'deck-companion--service-registry',
      filter: (data): data is { subject: Space } => isSpace(data.subject),
      component: ({ data }) => <ServiceRegistry space={data.subject} />,
    }),
  ]);
