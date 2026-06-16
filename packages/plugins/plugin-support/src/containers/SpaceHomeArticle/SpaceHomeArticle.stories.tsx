//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, fn, screen, userEvent, waitFor } from 'storybook/test';

import { makeOperationCapture, withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents, LayoutOperation } from '@dxos/app-toolkit';
import { AssistantOperation } from '@dxos/plugin-assistant';
import { AssistantPlugin } from '@dxos/plugin-assistant/testing';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { SpaceHomeArticle } from './SpaceHomeArticle';

/** Renders SpaceHomeArticle for the first available space. */
const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[0];
  if (!space) {
    // Still initializing — render a marker so play functions can waitFor it to disappear.
    return <div data-testid='loading' />;
  }
  return <SpaceHomeArticle role='article' space={space} />;
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
      setupEvents: [AppActivationEvents.SetupSettings],
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
 *
 * @idiom org.dxos.app-framework.testing.operationCapture
 *   applies: Testing suggestion-card clicks in SpaceHomeArticle
 *   instead-of: Loading RunPromptInNewChat handler and asserting navigation side effects
 *   uses: {@link makeOperationCapture}, {@link AssistantOperation.RunPromptInNewChat}
 */
export const SuggestionCardClick: Story = {
  play: async () => {
    capture.reset();

    // withPluginManager mounts the story via App after plugin activation; canvasElement is not
    // populated until then, so wait on screen for the home surface instead of the loading marker.
    const card = await screen.findByRole('button', { name: 'Draft a new document' }, { timeout: 15000 });
    await userEvent.click(card);

    const calls = capture.getCalls(AssistantOperation.RunPromptInNewChat);
    await expect(calls).toHaveLength(1);
    await expect(calls[0].input.prompt).toBe('Draft a new document');
  },
};

/**
 * Typing a custom prompt and pressing Enter persists the in-memory backing chat and navigates to
 * it (mocked via LayoutOperation.Open capture). Asserts navigation fires with the chat's path.
 *
 * Note: the component re-creates its backing chat whenever the input is reset (mount, and again
 * after each submit via the `nonce` bump), so `CreateChat` call counts are not asserted here — the
 * meaningful effect of submitting is the navigation, which only fires on submit.
 *
 * @idiom org.dxos.app-framework.testing.operationCapture
 *   applies: Testing custom prompt submission in SpaceHomeArticle
 *   instead-of: Running LayoutOperation.Open and dealing with full navigation in Storybook
 *   uses: {@link makeOperationCapture}, {@link LayoutOperation.Open}
 */
export const CustomPromptSubmit: Story = {
  play: async () => {
    capture.reset();

    const editor = await screen.findByRole('textbox', {}, { timeout: 15000 });
    await userEvent.click(editor);
    await userEvent.type(editor, 'What types of objects can I create here?');
    await userEvent.keyboard('{Enter}');

    // Submit navigates to the newly-persisted chat. LayoutOperation.Open is mocked — the navigation
    // is captured but not executed — and its subject is the chat's object path.
    // Graph.waitForPath polls up to 5 s for the node to appear; the storybook graph never populates
    // it (no section extensions), so navigation fires at the 5 s timeout edge. Use a generous
    // waitFor timeout to cover both the fast-path (node exists) and slow-path (timeout) cases.
    await waitFor(() => expect(capture.getCalls(LayoutOperation.Open)).toHaveLength(1), { timeout: 10000 });
    const navCalls = capture.getCalls(LayoutOperation.Open);
    await expect(navCalls[0].input.subject).toHaveLength(1);
  },
};
