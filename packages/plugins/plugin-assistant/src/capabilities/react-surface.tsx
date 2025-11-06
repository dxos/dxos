//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { getSpace } from '@dxos/client/echo';
import { Sequence } from '@dxos/conductor';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Obj } from '@dxos/echo';
import { SettingsStore } from '@dxos/local-storage';
import { StackItem } from '@dxos/react-ui-stack';

import {
  AssistantSettings,
  BlueprintArticle,
  ChatCompanion,
  ChatContainer,
  ChatDialog,
  PromptArticle,
} from '../components';
import { ASSISTANT_DIALOG, meta } from '../meta';
import { Assistant } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/plugin-settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<Assistant.Settings> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === meta.id,
      component: ({ data: { subject } }) => <AssistantSettings settings={subject.value} />,
    }),
    createSurface({
      id: `${meta.id}/chat`,
      role: 'article',
      filter: (data): data is { subject: Assistant.Chat; variant: undefined } =>
        Obj.instanceOf(Assistant.Chat, data.subject) && data.variant !== 'assistant-chat',
      component: ({ data, role }) => <ChatContainer role={role} chat={data.subject} />,
    }),
    createSurface({
      id: `${meta.id}/companion-chat`,
      role: 'article',
      filter: (data): data is { companionTo: Obj.Any; subject: Assistant.Chat | 'assistant-chat' } =>
        Obj.isObject(data.companionTo) &&
        (Obj.instanceOf(Assistant.Chat, data.subject) || data.subject === 'assistant-chat'),
      component: ({ data, role }) => <ChatCompanion role={role} data={data} />,
    }),
    createSurface({
      id: `${meta.id}/companion-logs`,
      role: 'article',
      filter: (data): data is { companionTo: Sequence } =>
        Obj.instanceOf(Sequence, data.companionTo) && data.subject === 'logs',
      // eslint-disable-next-line unused-imports/no-unused-vars
      component: ({ data, role }) => {
        const space = getSpace(data.companionTo);
        return (
          <StackItem.Content>
            <InvocationTraceContainer space={space} target={data.companionTo} detailAxis='block' />
          </StackItem.Content>
        );
      },
    }),
    createSurface({
      id: `${meta.id}/blueprint`,
      role: 'article',
      filter: (data): data is { subject: Blueprint.Blueprint } => Obj.instanceOf(Blueprint.Blueprint, data.subject),
      component: ({ data }) => <BlueprintArticle object={data.subject} />,
    }),
    createSurface({
      id: `${meta.id}/prompt`,
      role: 'article',
      filter: (data): data is { subject: Prompt.Prompt } => Obj.instanceOf(Prompt.Prompt, data.subject),
      component: ({ data }) => <PromptArticle object={data.subject} />,
    }),
    createSurface({
      id: ASSISTANT_DIALOG,
      role: 'dialog',
      filter: (data): data is { props: { chat: Assistant.Chat } } => data.component === ASSISTANT_DIALOG,
      component: ({ data }) => <ChatDialog {...data.props} />,
    }),
  ]);
