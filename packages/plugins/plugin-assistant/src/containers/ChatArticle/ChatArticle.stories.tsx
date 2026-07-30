//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { type AiService } from '@dxos/ai';
import { ScriptedLanguageModel, SERVICES_CONFIG } from '@dxos/ai/testing';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Chat } from '@dxos/assistant-toolkit';
import { capabilities } from '@dxos/assistant-toolkit/testing';
import { Feed, Filter, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { RoutinePlugin } from '@dxos/plugin-routine/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { Config } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withTheme } from '@dxos/react-ui/testing';
import { Message } from '@dxos/types';

import { translations } from '#translations';

import { AssistantPlugin } from '../../AssistantPlugin';
import { ChatArticle } from './ChatArticle';

/**
 * Replaces the AI service the plugin would build with a scripted model, so a story can drive the real
 * request loop offline and deterministically.
 *
 * Inert until something submits — the model is only consulted on a request, so stories that never submit
 * are unaffected. The script is exhausted rather than looped, so submitting more often than there are
 * replies fails loudly instead of hanging.
 */
const scriptedAiServiceMiddleware = (replies: readonly string[]) => (_upstream: AiService.Service) => ({
  model: () =>
    ScriptedLanguageModel.scriptedLanguageModelLayer(
      replies.map((reply) => ({ parts: [ScriptedLanguageModel.text(reply)] })),
    ),
});

/**
 * Types into the chat prompt and submits.
 *
 * The thread renders its own CodeMirror instance (read-only, but still `contenteditable`), so an
 * unscoped `.cm-content` lookup is ambiguous; `ChatPrompt` wraps the real editor in a `role="group"`.
 */
const submitPrompt = async (canvasElement: HTMLElement, text: string) => {
  const content = await waitFor(
    () => {
      const element = canvasElement.querySelector<HTMLElement>('[role="group"] .cm-content');
      if (!element) {
        throw new Error('Prompt editor not found.');
      }
      return element;
    },
    { timeout: 15_000, interval: 300 },
  );

  await userEvent.click(content);
  await userEvent.type(content, text);
  await userEvent.keyboard('{Enter}');
};

type StoryProps = {
  /** Turns the story drives: each prompt is submitted, and its reply is what the scripted model returns. */
  messages?: { prompt: string; reply: string }[];
};

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
    withPluginManager<StoryProps>(({ args: { messages = [] } }) => {
      return {
        setupEvents: [AppActivationEvents.SetupSettings],
        plugins: [
          ...corePlugins(),
          ClientPlugin({
            types: [Chat.Chat, Feed.Feed, Message.Message],
            config: new Config({ runtime: { services: SERVICES_CONFIG.REMOTE } }),
            onClientInitialized: ({ client }) =>
              Effect.gen(function* () {
                yield* initializeIdentity(client);
                const [space] = client.spaces.get();
                yield* Effect.promise(() => space.waitUntilReady());
                const feed = space.db.add(Feed.make());
                space.db.add(Chat.make({ name: 'Test', feed: Ref.make(feed) }));

                yield* Effect.promise(() => space.db.flush({ indexes: true }));
              }),
          }),
          RoutinePlugin(),
          AssistantPlugin({
            aiServiceMiddleware: scriptedAiServiceMiddleware(messages.map(({ reply }) => reply)),
          }),
          PreviewPlugin(),
          StorybookPlugin({}),
        ],
        capabilities,
      };
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<StoryProps>;

export default meta;

type Story = StoryObj<StoryProps>;

export const Default: Story = {};

/**
 * Drives the real request loop against the scripted model — no network and no seeded feed. This is the
 * precondition for exercising rewind against turns the app itself produced.
 */
export const Scripted: Story = {
  args: {
    messages: [
      {
        prompt: 'What is a feed?',
        reply: 'A feed is an append-only log.',
      },
    ],
  },
  play: async ({ canvasElement, args: { messages = [] } }) => {
    const { prompt, reply } = messages[0];
    await submitPrompt(canvasElement, prompt);
    await waitFor(() => void expect(canvasElement.textContent ?? '').toContain(reply), {
      timeout: 20_000,
      interval: 300,
    });
  },
};

/**
 * Soft fork ("rewind") driven entirely through the UI: submits a turn against the scripted model, then
 * presses the branch toolbar under the prompt. The prompt becomes the head, so its reply is no longer
 * reachable and stops rendering — while staying in the feed.
 */
export const Rewind: Story = {
  args: {
    messages: [
      {
        prompt: 'What is a feed?',
        reply: 'A feed is an append-only log.',
      },
    ],
  },
  play: async ({ canvasElement, args: { messages = [] } }) => {
    const { prompt, reply } = messages[0];
    const text = () => canvasElement.textContent ?? '';

    await submitPrompt(canvasElement, prompt);
    await waitFor(() => void expect(text()).toContain(reply), { timeout: 8_000, interval: 200 });

    const toolbar = canvasElement.querySelector<HTMLElement>('[data-testid="chat.rewind"]');
    await expect(toolbar).not.toBeNull();
    toolbar!.click();

    // The reply is downstream of the prompt we rewound to, so it drops out of the rendered branch.
    await waitFor(() => void expect(text()).not.toContain(reply), { timeout: 5_000, interval: 200 });
    await expect(text()).toContain(prompt);
  },
};
