//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback, useState } from 'react';
import { expect, within } from 'storybook/test';

import { SERVICES_CONFIG } from '@dxos/ai/testing';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useAtomCapability } from '@dxos/app-framework/ui';
import { Chat as ChatType } from '@dxos/assistant-toolkit';
import { capabilities } from '@dxos/assistant-toolkit/testing';
import { Feed, Filter, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { Config } from '@dxos/react-client';
import { useRegistry, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message, Task } from '@dxos/types';

import { useChatProcessor, useChatServices, usePresets } from '#hooks';
import { AssistantPlugin } from '#plugin';
import { translations } from '#translations';
import { AssistantCapabilities } from '#types';

import { Chat, type ChatEvent } from '../Chat/index.ts';

type StoryArgs = {
  /** Seed the chat's checklist, so the tasks toggle has something to show. */
  tasks?: { title: string; status?: Task.Task['status'] }[];
  tasksVisible?: boolean;
};

const DefaultStory = ({ tasksVisible: initialTasksVisible }: StoryArgs) => {
  const [space] = useSpaces();
  const [chat] = useQuery(space?.db, Filter.type(ChatType.Chat));
  const settings = useAtomCapability(AssistantCapabilities.Settings);
  const registry = useRegistry();
  const { preset, ...chatProps } = usePresets(settings);
  const db = space?.db;
  const runtime = useChatServices({ id: db?.spaceId });
  const processor = useChatProcessor({ db, chat, preset, runtime, registry, settings });

  // Held here, as `ChatArticle` holds it: the prompt only reports the toggle, since the checklist it
  // shows and hides is its sibling, not its child.
  const [tasksVisible, setTasksVisible] = useState(initialTasksVisible);
  const handleEvent = useCallback((event: ChatEvent) => {
    if (event.type === 'toggle-tasks') {
      setTasksVisible((visible) => !visible);
    }
  }, []);

  if (!chat || !db || !processor) {
    return <Loading />;
  }

  return (
    <div className='flex justify-center p-4'>
      <div className='w-full max-w-document-width'>
        <Chat.Root chat={chat} db={db} processor={processor} onEvent={handleEvent}>
          {tasksVisible && <Chat.TaskList classNames='border border-separator border-b-0 rounded-t-sm' />}
          {/* `attendableId` is the graph node contributed actions are filed under; the story's chat
              has no node, so the row shows only its own controls unless a plugin renders one. */}
          <Chat.Prompt
            {...chatProps}
            outline
            preset={preset?.id}
            tasksVisible={tasksVisible}
            classNames={[tasksVisible && 'rounded-t-none']}
          />
        </Chat.Root>
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/components/ChatPrompt',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column', classNames: 'flex flex-col justify-end w-[30rem]' }),
    withPluginManager<StoryArgs>(({ args: { tasks = [] } }) => ({
      plugins: [
        ...corePlugins(),
        ClientPlugin.make({
          types: [ChatType.Chat, Feed.Feed, Message.Message, Task.Task],
          config: new Config({ runtime: { services: SERVICES_CONFIG.REMOTE } }),
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());
              const feed = space.db.add(Feed.make());
              const chat = space.db.add(ChatType.make({ name: 'Test', feed: Ref.make(feed) }));
              for (const { title, status } of tasks) {
                ChatType.addTask(space.db, chat, title, { status });
              }
              // The task list reads its rows through resolve-once ref atoms; load them so the story
              // renders without waiting on a lazy resolution nothing triggers.
              yield* Effect.promise(() => Promise.all(chat.tasks.map((task: Ref.Ref<Task.Task>) => task.load())));
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
        AssistantPlugin({}),
        StorybookPlugin.make({}),
      ],
      capabilities,
    })),
  ],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  args: {},
};

export const WithTasks: Story = {
  args: {
    tasksVisible: true,
    tasks: [
      { title: 'Gather the requirements', status: 'done' },
      { title: 'Draft the plan', status: 'started' },
      { title: 'Verify and ship', status: 'todo' },
    ],
  },
};

/**
 * The row's own controls, with nothing contributed to it. The microphone is deliberately absent:
 * it is not the prompt's, it is filed on the chat's graph node by plugin-transcription.
 */
export const TestBareRow: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Generous: the story boots a client and a space before the prompt exists at all.
    await canvas.findByTestId('assistant.send', {}, { timeout: 30_000 });
    await expect(canvas.queryByTestId('transcription.record')).toBeNull();
  },
};
