//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';
import React, { useCallback, useEffect, useRef } from 'react';

import { Capabilities, contributes, createIntent, createSurface, useIntentDispatcher } from '@dxos/app-framework';
import { Blueprint } from '@dxos/blueprints';
import { getSpace } from '@dxos/client/echo';
import { Sequence } from '@dxos/conductor';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { SettingsStore } from '@dxos/local-storage';
import { SpaceAction } from '@dxos/plugin-space/types';
import { useQuery } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';

import {
  AssistantSettings,
  BlueprintContainer,
  ChatContainer,
  ChatDialog,
  PromptSettings,
  SequenceContainer,
} from '../components';
import { type AiChatProcessor } from '../hooks';
import { ASSISTANT_DIALOG, meta } from '../meta';
import { Assistant, AssistantAction } from '../types';

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
    // TODO(burdon): Factor out to component.
    createSurface({
      id: `${meta.id}/companion-chat`,
      role: 'article',
      filter: (data): data is { companionTo: Obj.Any; subject: Assistant.Chat | 'assistant-chat' } =>
        Obj.isObject(data.companionTo) &&
        (Obj.instanceOf(Assistant.Chat, data.subject) || data.subject === 'assistant-chat'),
      component: ({ data, role }) => {
        const { dispatch } = useIntentDispatcher();

        // TODO(burdon): How should we manage multiple companion chats?
        // TODO(burdon): Garbage collection of queues?
        const handleChatCreate = useCallback(async () => {
          const space = getSpace(data.companionTo);
          if (!space) {
            return;
          }

          // NOTE: The plugin's graph builder is currently responsible for selecting the (last) companion chat.
          await Effect.runPromise(
            Effect.gen(function* () {
              const { object } = yield* dispatch(createIntent(AssistantAction.CreateChat, { space }));
              yield* dispatch(createIntent(SpaceAction.AddObject, { object, target: space, hidden: true }));
              yield* dispatch(
                createIntent(SpaceAction.AddRelation, {
                  space,
                  schema: Assistant.CompanionTo,
                  source: object,
                  target: data.companionTo,
                }),
              );
            }),
          );
        }, [dispatch, data]);

        // Initialize companion chat if it doesn't exist.
        // TODO(wittjosiah): Factor out to container.
        const space = getSpace(data.companionTo);
        const companions = useQuery(
          space,
          Query.select(Filter.ids(data.companionTo.id)).targetOf(Assistant.CompanionTo).source(),
        );
        useAsyncEffect(async () => {
          if (companions.length > 0) {
            return;
          } else {
            await handleChatCreate();
          }
        }, [companions, data.subject]);

        const processorRef = useRef<AiChatProcessor>();
        const processor = processorRef.current;
        useEffect(() => {
          if (!processor) {
            return;
          }

          // TODO(burdon): Check if already bound.
          if (Obj.instanceOf(Blueprint.Blueprint, data.companionTo)) {
            void processor.context.bind({ blueprints: [Ref.make(data.companionTo)] });
          } else {
            void processor.context.bind({ objects: [Ref.make(data.companionTo)] });
          }
        }, [processor, data.companionTo]);

        if (data.subject === 'assistant-chat') {
          return null;
        }

        return <ChatContainer ref={processorRef} role={role} chat={data.subject} onChatCreate={handleChatCreate} />;
      },
    }),
    createSurface({
      id: `${meta.id}/sequence`,
      role: 'article',
      filter: (data): data is { subject: Sequence } => Obj.instanceOf(Sequence, data.subject),
      component: ({ data }) => <SequenceContainer sequence={data.subject} />,
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
      component: ({ data }) => <BlueprintContainer blueprint={data.subject} />,
    }),
    createSurface({
      id: `${meta.id}/prompt-settings`,
      role: 'object-settings',
      filter: (data): data is { subject: Blueprint.Blueprint } => Obj.instanceOf(Blueprint.Blueprint, data.subject),
      component: ({ data }) => <PromptSettings template={data.subject.instructions} />,
    }),
    createSurface({
      id: ASSISTANT_DIALOG,
      role: 'dialog',
      filter: (data): data is { props: { chat: Assistant.Chat } } => data.component === ASSISTANT_DIALOG,
      component: ({ data }) => <ChatDialog {...data.props} />,
    }),
  ]);
