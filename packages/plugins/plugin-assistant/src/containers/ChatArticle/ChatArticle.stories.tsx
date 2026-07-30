//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useRef } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { SERVICES_CONFIG } from '@dxos/ai/testing';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Chat } from '@dxos/assistant-toolkit';
import { capabilities } from '@dxos/assistant-toolkit/testing';
import { Instructions, Project } from '@dxos/compute';
import { Database, Feed as EchoFeed, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { EffectEx } from '@dxos/effect';
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

const PROJECT_NAME = 'Story project';

const DefaultStory = () => {
  const [space] = useSpaces();
  const [chat] = useQuery(space?.db, Filter.type(Chat.Chat));
  if (!chat) {
    return <Loading />;
  }

  return <ChatArticle role='article' subject={chat} attendableId='story' />;
};

/** Renders the prompt bound to a project whose instructions carry sentinel commands. */
const WithProjectCommandsStory = () => {
  const [space] = useSpaces();
  const [chat] = useQuery(space?.db, Filter.type(Chat.Chat));
  const [project] = useQuery(space?.db, Filter.type(Project.Project));
  if (!chat || !project) {
    return <Loading />;
  }

  return <ChatArticle role='article' subject={chat} attendableId='story' companionTo={project} />;
};

const FIRST = 'What is a feed?';
const ANSWER = 'An append-only log.';
const ABANDONED_PROMPT = 'Tell me about zebras instead';
const ABANDONED_ANSWER = 'Zebras are striped.';
const RETRY = 'How does replication work?';

let clock = 0;

const message = (text: string, sender: 'user' | 'assistant' = 'user') =>
  Message.make({ created: new Date(clock++).toISOString(), sender, blocks: [{ _tag: 'text', text }] });

/**
 * Seeds a soft-forked conversation into the chat's feed, then renders it. The fork is seeded rather
 * than driven through the model so the story stays deterministic and needs no AI call.
 */
const RewindStory = () => {
  const [space] = useSpaces();
  const [chat] = useQuery(space?.db, Filter.type(Chat.Chat));
  const seeded = useRef(false);

  useEffect(() => {
    if (!space || !chat || seeded.current) {
      return;
    }
    seeded.current = true;

    const feed = chat.feed.target;
    if (!feed) {
      seeded.current = false;
      return;
    }

    // Built in order: `created` breaks position ties, so constructing the answer first would date it
    // before the question it answers.
    const first = message(FIRST);
    const answer = message(ANSWER, 'assistant');
    const abandonedPrompt = message(ABANDONED_PROMPT);
    const abandonedAnswer = message(ABANDONED_ANSWER, 'assistant');
    const retry = message(RETRY);

    void EffectEx.runAndForwardErrors(
      Effect.gen(function* () {
        yield* EchoFeed.append(feed, [first, answer, abandonedPrompt, abandonedAnswer]);
        // Continue from the first answer, leaving the two turns after it unreachable.
        yield* EchoFeed.append(feed, [retry], { parent: answer });
        yield* Database.flush();
      }).pipe(Effect.provide(Database.layer(space.db))),
    );
  }, [space, chat]);

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
          types: [Chat.Chat, Feed.Feed, Project.Project, Instructions.Instructions],
          config: new Config({ runtime: { services: SERVICES_CONFIG.REMOTE } }),
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());
              const feed = space.db.add(Feed.make());
              space.db.add(Chat.make({ name: 'Test', feed: Ref.make(feed) }));

              const instructions = Instructions.make({
                text: 'You are an assistant focused on this project.',
                commands: [{ sentinel: '$track', description: 'Record a follow-up task', prompt: 'Track: {{text}}' }],
              });
              const project = Project.make({ name: PROJECT_NAME });
              Obj.setParent(instructions, project);
              Obj.update(project, (project) => {
                project.instructions = Ref.make(instructions);
              });
              space.db.add(project);

              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
        RoutinePlugin(),
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

/**
 * Soft fork ("rewind"): the last turn continues from the first answer rather than the feed's tip, so the
 * two turns in between are unreachable and must not render — while remaining in the log.
 */
export const Rewind: Story = {
  render: RewindStory,
  play: async ({ canvasElement }) => {
    const text = () => canvasElement.textContent ?? '';

    await waitFor(
      () => {
        void expect(text()).toContain(FIRST);
        void expect(text()).toContain(ANSWER);
        void expect(text()).toContain(RETRY);
      },
      { timeout: 13_000, interval: 300 },
    );

    // Rewound past, so unreachable from the head.
    void expect(text()).not.toContain(ABANDONED_PROMPT);
    void expect(text()).not.toContain(ABANDONED_ANSWER);

    // One branch toolbar per surviving user prompt.
    void expect(canvasElement.querySelectorAll('[data-testid="chat.rewind"]')).toHaveLength(2);
  },
};

/**
 * The prompt's `$`-trigger completion is sourced from the bound project's instructions.
 * Deterministic — types into the prompt editor and inspects the completion popover; no AI call.
 */
export const WithProjectCommands: Story = {
  render: WithProjectCommandsStory,
  play: async ({ canvasElement }) => {
    const optionLabels = () =>
      Array.from(canvasElement.querySelectorAll('.cm-completionLabel')).map((node) => node.textContent);

    // The thread also renders a CodeMirror instance (the markdown stream — `readOnly` filters edits
    // but still leaves `contenteditable="true"` in the DOM), so an unscoped `.cm-content` lookup is
    // ambiguous; `ChatPrompt` renders its own `role="group"` wrapper around the real editor. That
    // editor also remounts (CodeMirror destroys/recreates the view) while `companionTo`'s project and
    // instructions resolve asynchronously after mount, so a DOM node captured once can go stale —
    // re-query the live element and retry the keystroke on every attempt within a single bounded
    // wait (the storybook test-addon's play-function timeout leaves no room for two sequential waits).
    await waitFor(
      async () => {
        const content = canvasElement.querySelector<HTMLElement>('[role="group"] .cm-content');
        if (!content) {
          throw new Error('Prompt editor content not found.');
        }
        if (optionLabels().length === 0) {
          await userEvent.click(content);
          await userEvent.type(content, '{Backspace}{Backspace}{Backspace}{Backspace}$t');
        }
        void expect(optionLabels()).toEqual(['$track']);
      },
      { timeout: 13_000, interval: 300 },
    );
  },
};
