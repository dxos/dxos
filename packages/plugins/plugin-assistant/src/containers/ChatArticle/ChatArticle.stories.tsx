//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { SERVICES_CONFIG } from '@dxos/ai/testing';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Chat } from '@dxos/assistant-toolkit';
import { capabilities } from '@dxos/assistant-toolkit/testing';
import { Instructions, Project } from '@dxos/compute';
import { Feed, Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { RoutinePlugin } from '@dxos/plugin-routine/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { Config } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withTheme } from '@dxos/react-ui/testing';

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

const meta = {
  title: 'plugins/plugin-assistant/containers/ChatArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withPluginManager({
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
