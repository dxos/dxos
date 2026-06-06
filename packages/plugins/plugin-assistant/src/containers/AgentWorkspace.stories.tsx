//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { useProcessManagerRuntime } from '@dxos/app-framework/ui';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Chat } from '@dxos/assistant-toolkit';
import { capabilities } from '@dxos/assistant-toolkit/testing';
import { Trace } from '@dxos/compute';
import { ProcessManager } from '@dxos/compute-runtime';
import { Feed, Filter, Ref } from '@dxos/echo';
import { AutomationPlugin } from '@dxos/plugin-automation/testing';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { IconButton, Panel, Toolbar } from '@dxos/react-ui';
import { Loading, withTheme } from '@dxos/react-ui/testing';

import { AssistantPlugin } from '#plugin';
import { translations } from '#translations';

import { ChatArticle } from './ChatArticle/ChatArticle';
import { SimulatedAgent } from './TracePanel/testing';
import { TracePanel } from './TracePanel/TracePanel';

// Two surfaces side by side: the conversational ChatArticle (left) and the activity TracePanel
// (right) over a single shared space. The "Start agent" toolbar spawns a simulated agent so the
// trace timeline has activity to render.
const DefaultStory = () => {
  const [space] = useSpaces();
  const [chat] = useQuery(space?.db, Filter.type(Chat.Chat));
  const runtime = useProcessManagerRuntime();

  const handleStart = useCallback(() => {
    if (!runtime) {
      return;
    }
    void runtime.runPromise(
      Effect.gen(function* () {
        const manager = yield* ProcessManager.Service;
        const handle = yield* manager.spawn(SimulatedAgent);
        yield* handle.submitInput(Math.floor(Math.random() * 1_000));
      }),
    );
  }, [runtime]);

  if (!space || !chat) {
    return <Loading />;
  }

  return (
    <div className='grid grid-cols-[1fr_24rem] is-full bs-full overflow-hidden'>
      <ChatArticle role='article' subject={chat} space={space} attendableId='story-chat' />
      <Panel.Root classNames='border-l border-separator'>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <IconButton icon='ph--plus--regular' label='Start agent' onClick={handleStart} />
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <TracePanel space={space} attendableId='story-trace' />
        </Panel.Content>
      </Panel.Root>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/AgentWorkspace',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Chat.Chat, Feed.Feed, Trace.Message],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());

              const feed = space.db.add(Feed.make());
              space.db.add(Chat.make({ name: 'Test chat', feed: Ref.make(feed) }));
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
        AutomationPlugin(),
        AssistantPlugin(),
        PreviewPlugin(),
        StorybookPlugin({}),
      ],
      capabilities,
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
