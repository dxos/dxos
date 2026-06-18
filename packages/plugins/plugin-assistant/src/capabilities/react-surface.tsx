//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { type ComponentProps, useEffect } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import { Chat, Agent, Plan } from '@dxos/assistant-toolkit';
import { getSpace } from '@dxos/client/echo';
import { Blueprint, Routine } from '@dxos/compute';
import { Sequence } from '@dxos/conductor';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Feed, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { SpaceHomeContent, SpaceHomePinBottom } from '@dxos/plugin-space';
import { Panel } from '@dxos/react-ui';

import { AssistantSettings } from '#components';
import {
  BlueprintArticle,
  ChatCompanion,
  ChatArticle,
  ChatDialog,
  AgentArticle,
  AgentProperties,
  PlanArticle,
  RoutineArticle,
  RoutineList,
  SpaceHomePrompt,
  SpaceHomeSuggestions,
  TracePanel,
  TriggerStatus,
} from '#containers';
import { ASSISTANT_COMPANION_VARIANT, ASSISTANT_DIALOG, meta } from '#meta';
import { type Assistant } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Assistant.Settings>(subject.atom);
          return <AssistantSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
      Surface.create({
        id: 'spaceHomePrompt',
        filter: Surface.makeFilter(SpaceHomePinBottom),
        component: ({ data }) => <SpaceHomePrompt space={data.space} />,
      }),
      Surface.create({
        id: 'spaceHomeSuggestions',
        filter: Surface.makeFilter(SpaceHomeContent),
        position: 'last',
        component: ({ data }) => <SpaceHomeSuggestions space={data.space} />,
      }),
      Surface.create({
        id: 'chat',
        role: 'article',
        filter: (data): data is { attendableId: string; subject: Chat.Chat; variant: undefined } =>
          typeof data.attendableId === 'string' &&
          Obj.instanceOf(Chat.Chat, data.subject) &&
          data.variant !== ASSISTANT_COMPANION_VARIANT,
        component: ({ data, role, ref }) => {
          return <ChatArticle role={role} subject={data.subject} attendableId={data.attendableId} ref={ref} />;
        },
      }),
      Surface.create({
        id: 'agent',
        filter: AppSurface.object(AppSurface.Article, Agent.Agent),
        component: ({ data, role }) => (
          <AgentArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'objectProperties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Agent.Agent),
        component: ({ data }) => <AgentProperties subject={data.subject} />,
      }),
      Surface.create({
        id: 'companionChat',
        role: 'article',
        filter: (data): data is { subject: Chat.Chat | null; attendableId: string; companionTo: Obj.Unknown } =>
          typeof data.attendableId === 'string' &&
          Obj.isObject(data.companionTo) &&
          (Obj.instanceOf(Chat.Chat, data.subject) || data.subject === null),
        component: ({ data: { subject, attendableId, companionTo }, role, ref }) => (
          <ChatCompanion
            role={role}
            subject={subject}
            attendableId={attendableId}
            companionTo={companionTo}
            ref={ref}
          />
        ),
      }),
      Surface.create({
        id: 'companionInvocations',
        role: 'article',
        filter: (data): data is { companionTo: Sequence.Sequence } =>
          (Obj.instanceOf(Sequence.Sequence, data.companionTo) || Obj.instanceOf(Routine.Routine, data.companionTo)) &&
          data.subject === 'invocations',
        component: ({ data, role }) => {
          const space = getSpace(data.companionTo);
          const feed = space?.properties.invocationTraceFeed?.target;
          const feedDXN = feed ? Feed.getQueueUri(feed) : undefined;
          // TODO(wittjosiah): Support invocation filtering for prompts.
          const target = Obj.instanceOf(Routine.Routine, data.companionTo) ? undefined : data.companionTo;

          return (
            <Panel.Root role={role} className='dx-document'>
              <Panel.Content asChild>
                <InvocationTraceContainer db={space?.db} feedDXN={feedDXN} target={target} detailAxis='block' />
              </Panel.Content>
            </Panel.Root>
          );
        },
      }),
      Surface.create({
        id: 'blueprint',
        filter: AppSurface.object(AppSurface.Article, Blueprint.Blueprint),
        component: ({ data, role }) => (
          <BlueprintArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'prompt',
        filter: AppSurface.object(AppSurface.Article, Routine.Routine),
        component: ({ data, role }) => (
          <RoutineArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'plan',
        filter: AppSurface.object(AppSurface.Article, Plan.Plan),
        component: ({ data, role }) => (
          <PlanArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: ASSISTANT_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof ChatDialog>>(AppSurface.Dialog, ASSISTANT_DIALOG),
        component: ({ data }) => <ChatDialog {...data.props} />,
      }),
      Surface.create({
        id: 'trace',
        filter: AppSurface.literal(Surface.makeType<{ subject: string }>('deck-companion--trace'), 'trace'),
        component: () => {
          const space = useActiveSpace();
          useEffect(() => {
            log('trace panel surface', { hasSpace: Boolean(space), spaceId: space?.id });
          }, [space?.id]);

          if (!space) {
            return null;
          }

          return <TracePanel space={space} />;
        },
      }),
      Surface.create({
        id: 'triggerStatus',
        role: 'status-indicator',
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <TriggerStatus role='status-indicator' space={space} />;
        },
      }),
      Surface.create({
        id: 'prompts',
        filter: AppSurface.subject(
          Surface.makeType<{ subject: Obj.Any; attendableId: string }>('prompts'),
          Obj.isObject,
        ),
        component: ({ data }) => <RoutineList subject={data.subject} />,
      }),
    ]),
  ),
);
