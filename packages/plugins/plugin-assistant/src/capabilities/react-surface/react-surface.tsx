//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useOperationInvoker, useSettingsState } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Chat, DatabaseBlueprint, MarkdownBlueprint, Project, WebSearchBlueprint } from '@dxos/assistant-toolkit';
import { Blueprint, Prompt, Template } from '@dxos/blueprints';
import { getSpace } from '@dxos/client/echo';
import { Sequence } from '@dxos/conductor';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Filter, Obj } from '@dxos/echo';
import { IconButton, Panel } from '@dxos/react-ui';

import {
  AssistantSettings,
  BlueprintArticle,
  ChatCompanion,
  ChatContainer,
  ChatDialog,
  ProjectArticle,
  ProjectSettings,
  PromptArticle,
  TracePanel,
  TriggerStatus,
} from '../../containers';
import { ASSISTANT_DIALOG, meta } from '../../meta';
import { AssistantOperation, type Assistant } from '../../types';
import { trim } from '@dxos/util';
import { useQuery } from '@dxos/react-client/echo';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}.plugin-settings`,
        role: 'article',
        filter: (data): data is { subject: AppCapabilities.Settings } =>
          AppCapabilities.isSettings(data.subject) && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Assistant.Settings>(subject.atom);
          return <AssistantSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
      Surface.create({
        id: `${meta.id}.chat`,
        role: 'article',
        filter: (data): data is { attendableId: string; subject: Chat.Chat; variant: undefined } =>
          typeof data.attendableId === 'string' &&
          Obj.instanceOf(Chat.Chat, data.subject) &&
          data.variant !== 'assistant-chat',
        component: ({ data, role, ref }) => (
          <ChatContainer role={role} subject={data.subject} attendableId={data.attendableId} ref={ref} />
        ),
      }),
      Surface.create({
        id: `${meta.id}.project`,
        role: 'article',
        filter: (data): data is { subject: Project.Project } => Obj.instanceOf(Project.Project, data.subject),
        component: ({ data, role }) => <ProjectArticle role={role} subject={data.subject} />,
      }),
      Surface.create({
        id: `${meta.id}.project.companion.settings`,
        role: 'object-settings',
        filter: (data): data is { subject: Project.Project } => Obj.instanceOf(Project.Project, data.subject),
        component: ({ data }) => <ProjectSettings subject={data.subject} />,
      }),
      // TODO(wittjosiah): This is flashing when chat changes.
      Surface.create({
        id: `${meta.id}.companion-chat`,
        role: 'article',
        filter: (
          data,
        ): data is { attendableId: string; companionTo: Obj.Unknown; subject: Chat.Chat | 'assistant-chat' } =>
          typeof data.attendableId === 'string' &&
          Obj.isObject(data.companionTo) &&
          (Obj.instanceOf(Chat.Chat, data.subject) || data.subject === 'assistant-chat'),
        component: ({ data, role, ref }) => <ChatCompanion role={role} data={data} ref={ref} />,
      }),
      Surface.create({
        id: `${meta.id}.companion-invocations`,
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
        id: `${meta.id}.blueprint`,
        role: 'article',
        filter: (data): data is { subject: Blueprint.Blueprint } => Obj.instanceOf(Blueprint.Blueprint, data.subject),
        component: ({ data }) => <BlueprintArticle subject={data.subject} />,
      }),
      Surface.create({
        id: `${meta.id}.prompt`,
        role: 'article',
        filter: (data): data is { subject: Prompt.Prompt } => Obj.instanceOf(Prompt.Prompt, data.subject),
        component: ({ data }) => <PromptArticle subject={data.subject} />,
      }),
      Surface.create({
        id: ASSISTANT_DIALOG,
        role: 'dialog',
        filter: (data): data is { props: { chat: Chat.Chat } } => data.component === ASSISTANT_DIALOG,
        component: ({ data }) => <ChatDialog {...data.props} />,
      }),
      Surface.create({
        id: `${meta.id}.trace`,
        role: 'deck-companion--trace',
        filter: (data): data is { subject: 'trace' } => data.subject === 'trace',
        component: () => <TracePanel />,
      }),
      Surface.create({
        id: `${meta.id}.status`,
        role: 'status-indicator',
        component: () => <TriggerStatus />,
      }),
      // TODO(burdon): Factor out.
      Surface.create({
        id: `${meta.id}.magic`,
        role: 'magic',
        filter: (data): data is { subject: Obj.Unknown } => Obj.isObject(data.subject),
        component: ({ data }) => {
          const { invokePromise } = useOperationInvoker();
          const db = Obj.getDatabase(data.subject);
          const prompts = useQuery(db, Filter.type(Prompt.Prompt));
          if (!db) {
            return null;
          }

          return (
            <div className='flex gap-2'>
              {prompts.map((prompt, i) => (
                <div key={i}>
                  <IconButton
                    icon='ph--magic-wand--regular'
                    label={Obj.getLabel(prompt) ?? Obj.getDXN(prompt).toString()}
                    onClick={async () => {
                      const { content } = await prompt.instructions.source.load();
                      void invokePromise(AssistantOperation.RunPromptInNewChat, {
                        db,
                        prompt: Template.process(content),
                        objects: [data.subject],
                        blueprints: [DatabaseBlueprint.key, WebSearchBlueprint.key, MarkdownBlueprint.key],
                      });
                    }}
                  />
                </div>
              ))}
            </div>
          );
        },
      }),
    ]),
  ),
);

const prompts: { label: string; prompt: string; blueprints: string[] }[] = [
  {
    label: 'Explain',
    prompt: trim`
      What is this?
    `,
    blueprints: [DatabaseBlueprint.key, WebSearchBlueprint.key, MarkdownBlueprint.key],
  },
  {
    label: 'Research',
    prompt: trim`
      Research and create a summary markdown document for this object and then create a relation to this object. 
      Do not include; do not include "<cite>" tags.
    `,
    blueprints: [DatabaseBlueprint.key, WebSearchBlueprint.key, MarkdownBlueprint.key],
  },
];
