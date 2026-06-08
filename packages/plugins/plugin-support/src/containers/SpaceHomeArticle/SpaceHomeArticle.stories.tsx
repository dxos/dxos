//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { makeOperationCapture, withPluginManager } from '@dxos/app-framework/testing';
import { LayoutOperation } from '@dxos/app-toolkit';
import { AssistantOperation } from '@dxos/plugin-assistant';
import { AssistantPlugin } from '@dxos/plugin-assistant/testing';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { SPACE_HOME_SUBJECT_PREFIX } from '../../constants';
import { SpaceHomeArticle } from './SpaceHomeArticle';

/** Renders SpaceHomeArticle for the first available space. */
const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[0];
  if (!space) {
    return null;
  }
  const subject = `${SPACE_HOME_SUBJECT_PREFIX}${space.id}`;
  return <SpaceHomeArticle role='article' subject={subject} />;
};

// Mock operations that should be captured but NOT executed (e.g. navigation has no effect in
// Storybook). Everything else (AssistantOperation.CreateChat, etc.) executes for real so the
// prompt flow works normally.
const capture = makeOperationCapture([AssistantOperation.RunPromptInNewChat, LayoutOperation.Open], fn);

const meta = {
  title: 'plugins/plugin-support/containers/SpaceHomeArticle',
  component: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(() => personalSpace.waitUntilReady());
            }),
        }),
        AssistantPlugin(),
      ],
      capabilities: (manager) => capture.wrap(manager),
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Personal space: shows Welcome panel + toolbar (Start tour, Hide Welcome) + assistant prompt. */
export const Default: Story = {};

/**
 * Clicking a suggestion card fires RunPromptInNewChat with the card's prompt text.
 * RunPromptInNewChat is mocked so no navigation occurs in Storybook.
 */
export const SuggestionCardClick: Story = {
  play: async ({ canvasElement }) => {
    capture.reset();
    const canvas = within(canvasElement);

    // Wait for suggestion cards to appear (space must be ready first).
    const card = await canvas.findByText('Draft a new document', {}, { timeout: 10000 });
    await userEvent.click(card);

    const calls = capture.getCalls(AssistantOperation.RunPromptInNewChat);
    await expect(calls).toHaveLength(1);
    await expect(calls[0].input.prompt).toBe('Draft a new document');
  },
};

/**
 * Typing a custom prompt and pressing Enter creates an in-memory chat (real) and then navigates
 * to it (mocked via LayoutOperation.Open capture). Asserts both operations are invoked.
 */
export const CustomPromptSubmit: Story = {
  play: async ({ canvasElement }) => {
    capture.reset();
    const canvas = within(canvasElement);

    const editor = await canvas.findByRole('textbox', {}, { timeout: 10000 });
    await userEvent.click(editor);
    await userEvent.type(editor, 'What types of objects can I create here?');
    await userEvent.keyboard('{Enter}');

    // CreateChat runs for real (not mocked) — in-memory chat is created.
    const chatCalls = capture.getCalls(AssistantOperation.CreateChat);
    await expect(chatCalls).toHaveLength(1);
    await expect(chatCalls[0].input.addToSpace).toBe(false);

    // LayoutOperation.Open is mocked — navigation was triggered but not executed.
    const navCalls = capture.getCalls(LayoutOperation.Open);
    await expect(navCalls).toHaveLength(1);
  },
};
