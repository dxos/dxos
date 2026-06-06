//
// Copyright 2026 DXOS.org
//

import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React from 'react';

import { AnthropicResolver } from '@dxos/ai/resolvers';
import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';
import { Chat } from '@dxos/assistant-toolkit';
import { capabilities } from '@dxos/assistant-toolkit/testing';
import { Trace } from '@dxos/compute';
import { Feed, Filter, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { AutomationPlugin } from '@dxos/plugin-automation/testing';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { ChatArticle, TracePanel } from '#containers';
import { AssistantPlugin } from '#plugin';
import { translations } from '#translations';

// Two surfaces side by side over a single shared space: the conversational ChatArticle (left) and
// the activity TracePanel (right). Submitting a prompt runs the real agent; TracePanel reflects its
// execution.
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

// Model resolver for storybook: the storybook client has no EDGE service configured, so
// AssistantPlugin's edge resolver throws on first prompt. Point the Anthropic client at the hosted
// EDGE AI proxy (browser-reachable, handles auth) instead of calling Anthropic directly (which the
// browser blocks via CORS). Contributed after the plugins so the resolver merge prefers it.
const storybookModelResolver = Capability.contributes(
  AppCapabilities.AiModelResolver,
  AnthropicResolver.make().pipe(
    Layer.provide(
      AnthropicClient.layer({ apiUrl: 'https://ai-service.dxos.workers.dev/provider/anthropic' }).pipe(
        Layer.provide(FetchHttpClient.layer),
      ),
    ),
  ),
);

// Contribute the resolver from a plugin (not the eager `capabilities` option) placed AFTER
// AssistantPlugin, so it is contributed last and the resolver merge prefers it over the edge one.
const StorybookModelResolverPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.storybookModelResolver'), name: 'Storybook Model Resolver' }),
).pipe(
  Plugin.addModule({
    id: 'storybook-model-resolver',
    activatesOn: ActivationEvents.Startup,
    activate: () => Effect.succeed([storybookModelResolver]),
  }),
  Plugin.make,
)();

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
        StorybookModelResolverPlugin,
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
