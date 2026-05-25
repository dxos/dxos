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
import { Feed, Filter, Ref } from '@dxos/echo';
import { AutomationPlugin } from '@dxos/plugin-automation/testing';
import { initializeIdentity, ClientPlugin } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { AssistantPlugin } from '../../AssistantPlugin';
import { ChatArticle } from './ChatArticle';

const DefaultStory = () => {
  const [space] = useSpaces();
  const [chat] = useQuery(space?.db, Filter.type(Chat.Chat));
  if (!chat) {
    return <Loading />;
  }

  return <ChatArticle role='article' subject={chat} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-assistant/containers/ChatArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Chat.Chat, Feed.Feed],
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
