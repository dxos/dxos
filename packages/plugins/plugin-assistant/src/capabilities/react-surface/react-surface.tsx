//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { useSettingsState } from '@dxos/app-framework/react';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { getSpace } from '@dxos/client/echo';
import { Sequence } from '@dxos/conductor';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Obj } from '@dxos/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { Initiative } from '@dxos/assistant-toolkit';

import {
  AssistantSettings,
  BlueprintArticle,
  ChatCompanion,
  ChatContainer,
  ChatDialog,
  InitiativeContainer,
  PromptArticle,
} from '../../components';
import { ASSISTANT_DIALOG, meta } from '../../meta';
import { Assistant } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      Common.createSurface({
        id: `${meta.id}/plugin-settings`,
        role: 'article',
        filter: (data): data is { subject: Common.Capability.Settings } =>
          Common.Capability.isSettings(data.subject) && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Assistant.Settings>(subject.atom);
          return <AssistantSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
      Common.createSurface({
        id: `${meta.id}/chat`,
        role: 'article',
        filter: (data): data is { subject: Assistant.Chat; variant: undefined } =>
          Obj.instanceOf(Assistant.Chat, data.subject) && data.variant !== 'assistant-chat',
        component: ({ data, role, ref }) => <ChatContainer role={role} chat={data.subject} ref={ref} />,
      }),
      Common.createSurface({
        id: `${meta.id}/initiative`,
        role: 'article',
        filter: (data): data is { subject: Initiative.Initiative } =>
          Obj.instanceOf(Initiative.Initiative, data.subject),
        component: ({ data, role }) => <InitiativeContainer role={role} initiative={data.subject} />,
      }),
      // TODO(wittjosiah): This is flashing when chat changes.
      Common.createSurface({
        id: `${meta.id}/companion-chat`,
        role: 'article',
        filter: (data): data is { companionTo: Obj.Any; subject: Assistant.Chat | 'assistant-chat' } =>
          Obj.isObject(data.companionTo) &&
          (Obj.instanceOf(Assistant.Chat, data.subject) || data.subject === 'assistant-chat'),
        component: ({ data, role, ref }) => <ChatCompanion role={role} data={data} ref={ref} />,
      }),
      Common.createSurface({
        id: `${meta.id}/companion-invocations`,
        role: 'article',
        filter: (data): data is { companionTo: Sequence } =>
          (Obj.instanceOf(Sequence, data.companionTo) || Obj.instanceOf(Prompt.Prompt, data.companionTo)) &&
          data.subject === 'invocations',
        component: ({ data }) => {
          const space = getSpace(data.companionTo);
          const queueDxn = space?.properties.invocationTraceQueue?.dxn;
          // TODO(wittjosiah): Support invocation filtering for prompts.
          const target = Obj.instanceOf(Prompt.Prompt, data.companionTo) ? undefined : data.companionTo;
          return (
            <StackItem.Content>
              <InvocationTraceContainer db={space?.db} queueDxn={queueDxn} target={target} detailAxis='block' />
            </StackItem.Content>
          );
        },
      }),
      Common.createSurface({
        id: `${meta.id}/blueprint`,
        role: 'article',
        filter: (data): data is { subject: Blueprint.Blueprint } => Obj.instanceOf(Blueprint.Blueprint, data.subject),
        component: ({ data }) => <BlueprintArticle subject={data.subject} />,
      }),
      Common.createSurface({
        id: `${meta.id}/prompt`,
        role: 'article',
        filter: (data): data is { subject: Prompt.Prompt } => Obj.instanceOf(Prompt.Prompt, data.subject),
        component: ({ data }) => <PromptArticle subject={data.subject} />,
      }),
      Common.createSurface({
        id: ASSISTANT_DIALOG,
        role: 'dialog',
        filter: (data): data is { props: { chat: Assistant.Chat } } => data.component === ASSISTANT_DIALOG,
        component: ({ data }) => <ChatDialog {...data.props} />,
      }),
    ]),
  ),
);
