//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Chat } from '@dxos/assistant-toolkit';
import { capabilities } from '@dxos/assistant-toolkit/testing';
import { Trace } from '@dxos/compute';
import { Feed, Filter, Ref } from '@dxos/echo';
import { AutomationPlugin } from '@dxos/plugin-automation/testing';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { AssistantPlugin } from '#plugin';
import { translations } from '#translations';

import { ChatArticle } from './ChatArticle/ChatArticle';
import { TracePanel } from './TracePanel/TracePanel';

// Two surfaces side by side over a single shared space: the conversational ChatArticle (left) and
// the activity TracePanel (right). Submitting a prompt runs the real agent; TracePanel reflects its
// execution. Plugin/capability (and AI) setup mirrors ChatArticle.stories.
const DefaultStory = () => {
  const [space] = useSpaces();
  const [chat] = useQuery(space?.db, Filter.type(Chat.Chat));
  if (!space || !chat) {
    return <Loading />;
  }

  return (
    <div className='dx-container grid grid-cols-[1fr_24rem]'>
      <ChatArticle role='article' subject={chat} attendableId='story-chat' />
      <Panel.Root classNames='border-l border-separator'>
        <Panel.Content asChild>
          <TracePanel space={space} attendableId='story-trace' />
        </Panel.Content>
      </Panel.Root>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/stories/AgentWorkspace',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
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
