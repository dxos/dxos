//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';
import React, { useEffect, useMemo } from 'react';

import { Capabilities, contributes, createIntent, createSurface, useIntentDispatcher } from '@dxos/app-framework';
import { Sequence } from '@dxos/conductor';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Filter, type Key, Obj, Query } from '@dxos/echo';
import { SettingsStore } from '@dxos/local-storage';
import { SpaceAction } from '@dxos/plugin-space/types';
import { fullyQualifiedId, getSpace, getTypename } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import {
  AssistantSettings,
  SequenceContainer,
  ChatContainer,
  PromptSettings,
  TemplateContainer,
  ChatDialog,
} from '../components';
import { ASSISTANT_PLUGIN, ASSISTANT_DIALOG } from '../meta';
import { Assistant, AssistantAction, type AssistantSettingsProps, TemplateType } from '../types';

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
      id: `${ASSISTANT_PLUGIN}/chat`,
      role: 'article',
      filter: (data): data is { subject: Assistant.Chat; variant: undefined } =>
        Obj.instanceOf(Assistant.Chat, data.subject) && data.variant !== 'assistant-chat',
      component: ({ data, role }) => <ChatContainer role={role} chat={data.subject} />,
    }),
    createSurface({
      id: `${ASSISTANT_PLUGIN}/object-chat`,
      role: 'article',
      filter: (data): data is { companionTo: Obj.Any; subject: Assistant.Chat | 'assistant-chat' } =>
        Obj.isObject(data.companionTo) &&
        (Obj.instanceOf(Assistant.Chat, data.subject) || data.subject === 'assistant-chat'),
      component: ({ data, role }) => {
        const { dispatch } = useIntentDispatcher();
        const associatedArtifact = useMemo(
          () => ({
            id: fullyQualifiedId(data.companionTo),
            typename: getTypename(data.companionTo) ?? 'unknown',
            spaceId: (getSpace(data.companionTo)?.id ?? 'unknown') as Key.SpaceId,
          }),
          [data.companionTo],
        );

        // TODO(wittjosiah): Factor out to container.
        useEffect(() => {
          const timeout = setTimeout(async () => {
            const space = getSpace(data.companionTo);
            if (space && data.subject === 'assistant-chat') {
              const result = await space.db
                .query(Query.select(Filter.ids(data.companionTo.id)).targetOf(Assistant.CompanionTo).source())
                .run();
              if (result.objects.length > 0) {
                return;
              }

              const program = Effect.gen(function* () {
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
              });
              void Effect.runPromise(program);
            }
          });

          return () => clearTimeout(timeout);
        }, [data.subject]);

        if (data.subject === 'assistant-chat') {
          return null;
        }

        return <ChatContainer role={role} chat={data.subject} artifact={associatedArtifact} />;
      },
    }),
    createSurface({
      id: `${ASSISTANT_PLUGIN}/sequence`,
      role: 'article',
      filter: (data): data is { subject: Sequence } => Obj.instanceOf(Sequence, data.subject),
      component: ({ data, role }) => <SequenceContainer role={role} sequence={data.subject} />,
    }),
    createSurface({
      id: `${ASSISTANT_PLUGIN}/companion/logs`,
      role: 'article',
      filter: (data): data is { companionTo: Sequence } =>
        Obj.instanceOf(Sequence, data.companionTo) && data.subject === 'logs',
      component: ({ data, role }) => {
        const space = getSpace(data.companionTo);
        return (
          <StackItem.Content role={role}>
            <InvocationTraceContainer space={space} target={data.companionTo} detailAxis='block' />
          </StackItem.Content>
        );
      },
    }),
    createSurface({
      id: `${ASSISTANT_PLUGIN}/template`,
      role: 'article',
      filter: (data): data is { subject: TemplateType } => Obj.instanceOf(TemplateType, data.subject),
      component: ({ data, role }) => <TemplateContainer role={role} template={data.subject} />,
    }),
    createSurface({
      id: ASSISTANT_DIALOG,
      role: 'dialog',
      filter: (data): data is { props: { chat: Assistant.Chat } } => data.component === ASSISTANT_DIALOG,
      component: ({ data }) => <ChatDialog {...data.props} />,
    }),
    createSurface({
      id: `${ASSISTANT_PLUGIN}/prompt-settings`,
      role: 'object-settings',
      filter: (data): data is { subject: TemplateType } => Obj.instanceOf(TemplateType, data.subject),
      component: ({ data }) => <PromptSettings template={data.subject} />,
    }),
  ]);
