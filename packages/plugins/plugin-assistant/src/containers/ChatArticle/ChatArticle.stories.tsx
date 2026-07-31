//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { type AiService } from '@dxos/ai';
import { ScriptedLanguageModel, SERVICES_CONFIG } from '@dxos/ai/testing';
import { withPluginManager } from '@dxos/app-framework/testing';
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
 * The model is built **once** and shared across requests. Constructing it per request — the obvious
 * shape, since `model()` returns a layer — gives each request its own cursor, so every turn replays the
 * first reply and a multi-turn story silently answers itself wrongly.
 *
 * Inert until something submits: the model is only consulted on a request, so stories that never submit
 * are unaffected. The script is exhausted rather than looped, so submitting more often than there are
 * replies fails loudly instead of hanging.
 */
const scriptedAiServiceMiddleware = (replies: readonly string[]) => {
  const model = Effect.runSync(
    ScriptedLanguageModel.makeScriptedLanguageModel(
      replies.map((reply) => ({ parts: [ScriptedLanguageModel.text(reply)] })),
    ),
  );
  const layer = Layer.succeed(LanguageModel.LanguageModel, model);
  return (_upstream: AiService.Service) => ({ model: () => layer });
};

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
            // Only the stories that declare their turns are scripted; the rest keep the real service, so
            // `Default` stays a place to actually talk to a model rather than one with an empty script.
            aiServiceMiddleware:
              messages.length > 0 ? scriptedAiServiceMiddleware(messages.map(({ reply }) => reply)) : undefined,
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
 * Soft fork ("rewind") driven entirely through the UI, over a realistic conversation: a greeting, then a
 * question, then a rewind of that question, then the same question asked differently.
 *
 * Rewinding is edit-and-resend: the prompt and its answer both leave the thread and the prompt text comes
 * back in the composer. The greeting survives, because it precedes the rewind point. The resend then
 * continues from the greeting, so the abandoned pair never rejoins the conversation.
 */
export const Rewind: Story = {
  args: {
    messages: [
      { prompt: 'Hello', reply: 'Hi — how can I help?' },
      { prompt: 'What is a feed?', reply: 'A feed is an append-only log.' },
      { prompt: 'What is a feed, in one sentence?', reply: 'An append-only log of immutable blocks.' },
    ],
  },
  play: async ({ canvasElement, args: { messages = [] } }) => {
    const [greeting, asked, revised] = messages;
    const toolbars = () => canvasElement.querySelectorAll<HTMLElement>('[data-testid="chat.rewind"]');

    // Greeting, then the question.
    await submitPrompt(canvasElement, greeting.prompt);
    await waitFor(() => void expect(threadText(canvasElement)).toContain(greeting.reply), {
      timeout: 8_000,
      interval: 200,
    });
    await submitPrompt(canvasElement, asked.prompt);
    await waitFor(() => void expect(threadText(canvasElement)).toContain(asked.reply), {
      timeout: 8_000,
      interval: 200,
    });

    // Let the reply finish streaming, so the rewind forks a settled turn.
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    await waitFor(() => void expect(toolbars()).toHaveLength(2), { timeout: 5_000, interval: 200 });

    // Rewind the question — the second prompt's toolbar.
    toolbars()[1].click();

    // The question and its answer leave the thread, and the greeting is untouched.
    await waitFor(() => void expect(threadText(canvasElement)).not.toContain(asked.reply), {
      timeout: 5_000,
      interval: 200,
    });
    await expect(threadText(canvasElement)).not.toContain(asked.prompt);
    await expect(threadText(canvasElement)).toContain(greeting.prompt);
    await expect(threadText(canvasElement)).toContain(greeting.reply);

    // Edit-and-resend: the question comes back in the composer, ready to be revised.
    await expect(composerText(canvasElement)).toContain(asked.prompt);

    // Ask it differently. The answer continues from the greeting, so the abandoned pair stays gone.
    await clearPrompt(canvasElement);
    await submitPrompt(canvasElement, revised.prompt);
    await waitFor(() => void expect(threadText(canvasElement)).toContain(revised.reply), {
      timeout: 8_000,
      interval: 200,
    });
    await expect(threadText(canvasElement)).toContain(revised.prompt);
    await expect(threadText(canvasElement)).not.toContain(asked.reply);
  },
};

/**
 * The rendered conversation, excluding the composer — both are CodeMirror instances, and the composer
 * holds the restored prompt after a rewind, so an unscoped read cannot tell "still in the thread" from
 * "waiting to be resent".
 */
const threadText = (canvasElement: HTMLElement) =>
  Array.from(canvasElement.querySelectorAll<HTMLElement>('.cm-content'))
    .filter((element) => !element.closest('[role="group"]'))
    .map((element) => element.textContent ?? '')
    .join('\n');

const composerText = (canvasElement: HTMLElement) =>
  canvasElement.querySelector<HTMLElement>('[role="group"] .cm-content')?.textContent ?? '';

/** Empties the composer, so a restored prompt can be replaced rather than appended to. */
const clearPrompt = async (canvasElement: HTMLElement) => {
  const content = canvasElement.querySelector<HTMLElement>('[role="group"] .cm-content');
  if (content) {
    await userEvent.click(content);
    await userEvent.keyboard('{Control>}a{/Control}{Backspace}');
  }
};
