//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { type FC, useCallback } from 'react';

import { ToolId } from '@dxos/ai';
import { EXA_API_KEY } from '@dxos/ai/testing';
import { Common } from '@dxos/app-framework';
import { Surface, useCapabilities, useCapability } from '@dxos/app-framework/react';
import { AiContextBinder } from '@dxos/assistant';
import { Agent, LinearBlueprint, ResearchBlueprint, ResearchDataTypes, ResearchGraph } from '@dxos/assistant-toolkit';
import { Blueprint, Prompt, Template } from '@dxos/blueprints';
import { Filter, Obj, Query, Ref, Tag, Type } from '@dxos/echo';
import { Example, Script, Trigger, serializeFunction } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { AssistantBlueprint, translations, useContextBinder } from '@dxos/plugin-assistant';
import { Assistant } from '@dxos/plugin-assistant/types';
import { Board, BoardPlugin } from '@dxos/plugin-board';
import { Chess, ChessPlugin } from '@dxos/plugin-chess';
import { ChessFunctions } from '@dxos/plugin-chess/blueprints';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { Calendar, Mailbox } from '@dxos/plugin-inbox/types';
import { Map, MapPlugin } from '@dxos/plugin-map';
import { createLocationSchema } from '@dxos/plugin-map/testing';
import { Markdown, MarkdownPlugin } from '@dxos/plugin-markdown';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { ProjectPlugin } from '@dxos/plugin-project';
import { ScriptPlugin, getAccessCredential } from '@dxos/plugin-script';
import { templates } from '@dxos/plugin-script/templates';
import { TablePlugin } from '@dxos/plugin-table';
import { ThreadPlugin } from '@dxos/plugin-thread';
import { TokenManagerPlugin } from '@dxos/plugin-token-manager';
import { TranscriptionPlugin } from '@dxos/plugin-transcription';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { Stack, StackItem } from '@dxos/react-ui-stack';
import { Table } from '@dxos/react-ui-table/types';
import { Text, View } from '@dxos/schema';
import { render } from '@dxos/storybook-utils';
import {
  AccessToken,
  Employer,
  Event,
  HasConnection,
  HasSubject,
  Message,
  Organization,
  Person,
  Project,
  Task,
  Transcript,
} from '@dxos/types';
import { isNonNullable, trim } from '@dxos/util';

import {
  BlueprintModule,
  ChatModule,
  ChessModule,
  CommentsModule,
  type ComponentProps,
  ExecutionGraphModule,
  GraphModule,
  InboxModule,
  InvocationsModule,
  ProjectModule,
  PromptModule,
  ResearchInputModule,
  ResearchOutputModule,
  ScriptModule,
  TasksModule,
  TokenManagerModule,
  TriggersModule,
} from '../components';
import {
  ResearchInputQueue,
  accessTokensFromEnv,
  addTestData,
  config,
  createTestMailbox,
  createTestTranscription,
  getDecorators,
  organizations,
  testTypes,
} from '../testing';

const panelClassNames = 'bg-baseSurface rounded-sm border border-separator overflow-hidden';

type StoryProps = {
  modules: FC<ComponentProps>[][];
  showContext?: boolean;
  blueprints?: string[];
};

const DefaultStory = ({ modules, showContext, blueprints = [] }: StoryProps) => {
  const blueprintsDefinitions = useCapabilities(Common.Capability.BlueprintDefinition);
  const atomRegistry = useCapability(Common.Capability.AtomRegistry);

  const space = useSpace();
  useAsyncEffect(async () => {
    if (!space) {
      return;
    }

    const chats = await space.db.query(Filter.type(Assistant.Chat)).run();
    const chat = chats[0];
    if (!chat) {
      return;
    }

    // Add blueprints to context.
    const blueprintRegistry = new Blueprint.Registry(blueprintsDefinitions);
    const blueprintObjects = blueprints
      .map((key) => {
        const blueprint = blueprintRegistry.getByKey(key);
        if (blueprint) {
          return space.db.add(Obj.clone(blueprint));
        }
      })
      .filter(isNonNullable);

    const binder = new AiContextBinder({ queue: await chat.queue.load(), registry: atomRegistry });
    await binder.use((binder) => binder.bind({ blueprints: blueprintObjects.map((blueprint) => Ref.make(blueprint)) }));
  }, [space, blueprints, blueprintsDefinitions]);

  const handleEvent = useCallback<NonNullable<ComponentProps['onEvent']>>((event) => {
    log.info('event', { event });
  }, []);

  const chats = useQuery(space?.db, Filter.type(Assistant.Chat));
  const binder = useContextBinder(chats.at(-1)?.queue.target);
  const objects = binder?.getObjects() ?? [];

  if (!space) {
    return null;
  }

  return (
    <Stack
      orientation='horizontal'
      size='split'
      rail={false}
      itemsCount={modules.length + (showContext ? 1 : 0)}
      classNames='absolute inset-0 gap-[--stack-gap]'
    >
      {modules.map((Components, i) => {
        return (
          <StackItem.Root key={i} item={{ id: `${i}` }}>
            <Stack
              orientation='vertical'
              classNames='gap-[--stack-gap]'
              size={i > 0 ? 'contain' : 'split'}
              itemsCount={Components.length}
              rail={false}
            >
              {Components.map((Component, i) => (
                <StackItem.Root key={i} item={{ id: `${i}` }} classNames={panelClassNames}>
                  <Component space={space} onEvent={handleEvent} />
                </StackItem.Root>
              ))}
            </Stack>
          </StackItem.Root>
        );
      })}

      {showContext && <StackContainer objects={objects} />}
    </Stack>
  );
};

const StackContainer = ({ objects }: { objects: Obj.Any[] }) => {
  return (
    <Stack
      orientation='vertical'
      classNames='gap-[--stack-gap]'
      size='contain'
      rail={false}
      itemsCount={objects.length}
    >
      {objects.map((object) => (
        <StackItem.Root key={object.id} item={object} classNames={panelClassNames}>
          <Surface role='section' limit={1} data={{ subject: object }} />
        </StackItem.Root>
      ))}
    </Stack>
  );
};

const storybook: Meta<typeof DefaultStory> = {
  title: 'stories/stories-assistant/Chat',
  render: render(DefaultStory),
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default storybook;

type Story = StoryObj<typeof storybook>;

export const Default: Story = {
  decorators: getDecorators({
    plugins: [MarkdownPlugin()],
    config: config.remote,
  }),
  args: {
    modules: [[ChatModule]],
  },
};
