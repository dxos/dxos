//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { type ComponentProps, useEffect } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace, useHomeVisibility } from '@dxos/app-toolkit/ui';
import { Agent, Chat, Plan } from '@dxos/assistant-toolkit';
import { getSpace } from '@dxos/client/echo';
import { Instructions } from '@dxos/compute';
import { Sequence } from '@dxos/conductor';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Feed, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { SpaceHomeContent, SpaceHomePinBottom } from '@dxos/plugin-space/components';
import { Panel } from '@dxos/react-ui';
import { Position } from '@dxos/util';

import { ChatSurface } from '#components';
import {
  AgentArticle,
  AgentProperties,
  AssistantSettings,
  ChatArticle,
  ChatCompanion,
  ChatDialog,
  IntegrationPrompt,
  PlanArticle,
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
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
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
        position: Position.last,
        component: ({ data }) => {
          const { visible, hide } = useHomeVisibility(data.space, 'spaceHomeSuggestions');
          return visible ? <SpaceHomeSuggestions space={data.space} onClose={hide} /> : null;
        },
      }),
      Surface.create({
        id: 'chat',
        filter: AppSurface.object(
          AppSurface.Article,
          Chat.Chat,
          (data) => data.variant !== ASSISTANT_COMPANION_VARIANT,
        ),
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
        filter: Surface.makeFilter(
          AppSurface.Article,
          (data) =>
            Obj.isObject(data.companionTo) && (Obj.instanceOf(Chat.Chat, data.subject) || data.subject === null),
        ),
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
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'invocations'),
          AppSurface.oneOf(
            AppSurface.companion(AppSurface.Article, Sequence.Sequence),
            AppSurface.companion(AppSurface.Article, Instructions.Instructions),
          ),
        ),
        component: ({ data, role }) => {
          const space = getSpace(data.companionTo);
          const feed = space?.properties.invocationTraceFeed?.target;
          const feedDXN = feed ? Feed.getFeedUri(feed) : undefined;
          // TODO(wittjosiah): Support invocation filtering for prompts.
          const target = Obj.instanceOf(Instructions.Instructions, data.companionTo) ? undefined : data.companionTo;

          return (
            <Panel.Root role={role} className='dx-document'>
              <Panel.Content>
                <InvocationTraceContainer db={space?.db} feedDXN={feedDXN} target={target} detailAxis='block' />
              </Panel.Content>
            </Panel.Root>
          );
        },
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
        filter: Surface.makeFilter(AppSurface.deckCompanion('trace')),
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
        id: 'integrationPrompt',
        filter: Surface.makeFilter(ChatSurface, (data) => data.role === 'integration-prompt'),
        component: ({ data }) => {
          // `data.data` is model-supplied JSON (untyped); narrow `service` before use.
          const service = typeof data.data?.service === 'string' ? data.data.service : undefined;
          return <IntegrationPrompt service={service} />;
        },
      }),
      Surface.create({
        id: 'triggerStatus',
        filter: Surface.makeFilter(AppSurface.StatusIndicator),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <TriggerStatus role='status-indicator' space={space} />;
        },
      }),
    ]),
  ),
);
