//
// Copyright 2025 DXOS.org
//

import { composeStories } from '@storybook/react';
import { cleanup, waitFor } from '@testing-library/react';
import { afterEach, describe, test } from 'vitest';

import * as stories from './Chat.stories';

const { Default, WithMarkdown, WithBlueprints, WithSearch, WithTriggers } = composeStories(stories);

// Presence of the CodeMirror editor signals full bootstrap: client initialized,
// plugins activated, and initial chat created by AssistantOperation.CreateChat.
const waitForChatEditor = () =>
  waitFor(
    () => {
      const editor = document.querySelector('.cm-content');
      if (!editor) {
        throw new Error('Chat editor not rendered');
      }
    },
    { timeout: 30_000 },
  );

describe('Chat stories', { timeout: 60_000 }, () => {
  afterEach(() => {
    cleanup();
  });

  test('Default renders', async () => {
    await Default.run();
    await waitForChatEditor();
  });

  test('WithMarkdown renders', async () => {
    await WithMarkdown.run();
    await waitForChatEditor();
  });

  test('WithBlueprints renders', async () => {
    await WithBlueprints.run();
    await waitForChatEditor();
  });

  test('WithSearch renders', async () => {
    await WithSearch.run();
    await waitForChatEditor();
  });

  test('WithTriggers renders', async () => {
    await WithTriggers.run();
    await waitForChatEditor();
  });
});
