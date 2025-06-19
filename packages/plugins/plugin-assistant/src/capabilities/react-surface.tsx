//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';
import React, { useEffect, useMemo } from 'react';

import { Capabilities, contributes, createIntent, createSurface, useIntentDispatcher } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { Filter, Query } from '@dxos/echo-schema';
import { SettingsStore } from '@dxos/local-storage';
import { SpaceAction } from '@dxos/plugin-space/types';
import {
  type AnyLiveObject,
  fullyQualifiedId,
  getSpace,
  getTypename,
  isEchoObject,
  type SpaceId,
} from '@dxos/react-client/echo';

import { AssistantDialog, AssistantSettings, ChatContainer, PromptSettings, TemplateContainer } from '../components';
import { ASSISTANT_PLUGIN, ASSISTANT_DIALOG } from '../meta';
import { AIChatType, AssistantAction, type AssistantSettingsProps, CompanionTo, TemplateType } from '../types';

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
        Obj.instanceOf(AIChatType, data.subject) && data.variant !== 'assistant-chat',
      component: ({ data, role }) => <ChatContainer role={role} chat={data.subject} />,
    }),
    createSurface({
      id: `${ASSISTANT_PLUGIN}/object-chat`,
      role: 'article',
      filter: (data): data is { companionTo: AnyLiveObject<any>; subject: AIChatType | 'assistant-chat' } =>
        isEchoObject(data.companionTo) &&
        (Obj.instanceOf(AIChatType, data.subject) || data.subject === 'assistant-chat'),
      component: ({ data, role }) => {
        const { dispatch } = useIntentDispatcher();
        const associatedArtifact = useMemo(
          () => ({
            id: fullyQualifiedId(data.companionTo),
            typename: getTypename(data.companionTo) ?? 'unknown',
            spaceId: (getSpace(data.companionTo)?.id ?? 'unknown') as SpaceId,
          }),
          [data.companionTo],
        );

        // TODO(wittjosiah): Factor out to container.
        useEffect(() => {
          const timeout = setTimeout(async () => {
            const space = getSpace(data.companionTo);
            if (space && data.subject === 'assistant-chat') {
              const result = await space.db
                .query(Query.select(Filter.ids(data.companionTo.id)).targetOf(CompanionTo).source())
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
                    schema: CompanionTo,
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

        return <ChatContainer role={role} chat={data.subject} associatedArtifact={associatedArtifact} />;
      },
    }),
    createSurface({
      id: `${ASSISTANT_PLUGIN}/template`,
      role: 'article',
      filter: (data): data is { subject: TemplateType } => Obj.instanceOf(TemplateType, data.subject),
      component: ({ data, role }) => <TemplateContainer role={role} template={data.subject} />,
    }),
    createSurface({
      id: `${ASSISTANT_PLUGIN}/prompt-settings`,
      role: 'object-settings',
      filter: (data): data is { subject: TemplateType } => Obj.instanceOf(TemplateType, data.subject),
      component: ({ data }) => <PromptSettings template={data.subject} />,
    }),
  ]);
