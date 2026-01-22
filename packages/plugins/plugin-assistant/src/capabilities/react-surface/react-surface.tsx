//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { getSpace } from '@dxos/client/echo';
import { Sequence } from '@dxos/conductor';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Obj } from '@dxos/echo';
import { StackItem } from '@dxos/react-ui-stack';

import {
  AssistantSettings,
  BlueprintArticle,
  ChatCompanion,
  ChatContainer,
  ChatDialog,
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
          const registry = useCapability(Common.Capability.AtomRegistry);
          const settings = useAtomValue(subject.atom, { registry }) as Assistant.Settings;
          return <AssistantSettings settings={settings} />;
        },
      }),
      Common.createSurface({
        id: `${meta.id}/chat`,
        role: 'article',
        filter: (data): data is { subject: Assistant.Chat; variant: undefined } =>
          Obj.instanceOf(Assistant.Chat, data.subject) && data.variant !== 'assistant-chat',
        component: ({ data, role, ref }) => <ChatContainer role={role} chat={data.subject} ref={ref} />,
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
