//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { Chat, Project } from '@dxos/assistant-toolkit';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { getSpace } from '@dxos/client/echo';
import { Sequence } from '@dxos/conductor';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Obj } from '@dxos/echo';
import { Panel } from '@dxos/react-ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';

import { AssistantSettings } from '#components';
import {
  BlueprintArticle,
  ChatCompanion,
  ChatContainer,
  ChatDialog,
  ProjectArticle,
  ProjectSettings,
  PromptArticle,
  PromptList,
  TracePanel,
  TriggerStatus,
} from '#containers';
import { ASSISTANT_COMPANION_VARIANT, ASSISTANT_DIALOG, meta } from '#meta';
import { type Assistant } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'plugin-settings',
        role: 'article',
        filter: AppSurface.settingsArticle(meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Assistant.Settings>(subject.atom);
          return <AssistantSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
      Surface.create({
        id: 'chat',
        role: 'article',
        filter: (data): data is { attendableId: string; subject: Chat.Chat; variant: undefined } =>
          typeof data.attendableId === 'string' &&
          Obj.instanceOf(Chat.Chat, data.subject) &&
          data.variant !== ASSISTANT_COMPANION_VARIANT,
        component: ({ data, role, ref }) => {
          return <ChatContainer role={role} subject={data.subject} attendableId={data.attendableId} ref={ref} />;
        },
      }),
      Surface.create({
        id: 'project',
        role: 'article',
        filter: AppSurface.objectArticle(Project.Project),
        component: ({ data, role }) => (
          <ProjectArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'project.companion.settings',
        role: 'object-settings',
        filter: AppSurface.objectSettings(Project.Project),
        component: ({ data }) => <ProjectSettings subject={data.subject} />,
      }),
      Surface.create({
        id: 'companion-chat',
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
        id: 'companion-invocations',
        role: 'article',
        filter: (data): data is { companionTo: Sequence } =>
          (Obj.instanceOf(Sequence, data.companionTo) || Obj.instanceOf(Prompt.Prompt, data.companionTo)) &&
          data.subject === 'invocations',
        component: ({ data, role }) => {
          const space = getSpace(data.companionTo);
          const queueDxn = space?.properties.invocationTraceQueue?.dxn;
          // TODO(wittjosiah): Support invocation filtering for prompts.
          const target = Obj.instanceOf(Prompt.Prompt, data.companionTo) ? undefined : data.companionTo;
          return (
            <Panel.Root role={role} className='dx-document'>
              <Panel.Content asChild>
                <InvocationTraceContainer db={space?.db} queueDxn={queueDxn} target={target} detailAxis='block' />
              </Panel.Content>
            </Panel.Root>
          );
        },
      }),
      Surface.create({
        id: 'blueprint',
        role: 'article',
        filter: AppSurface.objectArticle(Blueprint.Blueprint),
        component: ({ data, role }) => (
          <BlueprintArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'prompt',
        role: 'article',
        filter: AppSurface.objectArticle(Prompt.Prompt),
        component: ({ data, role }) => (
          <PromptArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: ASSISTANT_DIALOG,
        role: 'dialog',
        filter: AppSurface.componentDialog(ASSISTANT_DIALOG),
        component: ({ data }) => <ChatDialog {...data.props} />,
      }),
      Surface.create({
        id: 'trace',
        role: 'deck-companion--trace',
        filter: AppSurface.literalSection('trace'),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <TracePanel space={space} />;
        },
      }),
      Surface.create({
        id: 'status',
        role: 'status-indicator',
        component: () => <TriggerStatus />,
      }),
      Surface.create({
        id: 'prompts',
        role: 'prompts',
        filter: AppSurface.anyObjectSection(),
        component: ({ data }) => <PromptList subject={data.subject} />,
      }),
    ]),
  ),
);
