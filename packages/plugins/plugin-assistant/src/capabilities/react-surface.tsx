//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { SettingsStore } from '@dxos/local-storage';
import { fullyQualifiedId, getSpace, getTypename, isLiveObject, type SpaceId } from '@dxos/react-client/echo';

import { AssistantDialog, AssistantSettings, ChatContainer, PromptSettings, TemplateContainer } from '../components';
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
        Type.instanceOf(AIChatType, data.subject) && data.variant !== 'assistant-chat',
      component: ({ data, role }) => <ChatContainer role={role} chat={data.subject} />,
    }),
    createSurface({
      id: `${ASSISTANT_PLUGIN}/object-chat`,
      role: 'article',
      filter: (data): data is { companionTo: AIChatType; subject: 'assistant-chat' } =>
        isLiveObject(data.companionTo) &&
        (data as any).companionTo.assistantChatQueue &&
        data.subject === 'assistant-chat',
      component: ({ data, role }) => {
        const associatedArtifact = useMemo(
          () => ({
            id: fullyQualifiedId(data.companionTo),
            typename: getTypename(data.companionTo) ?? 'unknown',
            spaceId: (getSpace(data.companionTo)?.id ?? 'unknown') as SpaceId,
          }),
          [data.companionTo],
        );
        return <ChatContainer role={role} chat={data.companionTo} associatedArtifact={associatedArtifact} />;
      },
    }),
    createSurface({
      id: `${ASSISTANT_PLUGIN}/template`,
      role: 'article',
      filter: (data): data is { subject: TemplateType } => Type.instanceOf(TemplateType, data.subject),
      component: ({ data, role }) => <TemplateContainer role={role} template={data.subject} />,
    }),
    createSurface({
      id: `${ASSISTANT_PLUGIN}/prompt-settings`,
      role: 'object-settings',
      filter: (data): data is { subject: TemplateType } => Type.instanceOf(TemplateType, data.subject),
      component: ({ data }) => <PromptSettings template={data.subject} />,
    }),
  ]);
