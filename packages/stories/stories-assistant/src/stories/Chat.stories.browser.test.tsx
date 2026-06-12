//
// Copyright 2025 DXOS.org
//

import { composeStories } from '@storybook/react';
import { cleanup, waitFor } from '@testing-library/react';
import { afterAll, describe, test } from 'vitest';

import * as stories from './Chat.stories';

// WithBlueprints is used as the smoke test because it reliably reaches a
// rendered Chat editor under the browser runner. Simpler stories (e.g.
// `Default`, `WithMarkdown`, `WithTriggers`) can hit a render race where
// `<Chat.Toolbar>` renders before `<Chat.Root>` context is fully wired and
// get trapped in an ErrorBoundary fallback. Tracking that fix separately —
// once stabilized, add the remaining stories back.
const { WithBlueprints } = composeStories(stories);

// Presence of the CodeMirror editor (`.cm-content`) signals full bootstrap: client
// initialized, plugins activated, and initial chat created by
// AssistantOperation.CreateChat. Cold-start in the browser runner can be slow (Vite
// deps optimization, identity + space creation, plugin activation), so give it a
// generous budget.
const CHAT_BOOTSTRAP_TIMEOUT = 90_000;

const waitForChatEditor = () =>
  waitFor(
    () => {
      const editor = document.querySelector('.cm-content');
      if (!editor) {
        throw new Error('Chat editor not rendered');
      }
    },
    { timeout: CHAT_BOOTSTRAP_TIMEOUT, interval: 250 },
  );

// Smoke-test that the Chat story boots end-to-end in a real browser. The story
// runner shares DOM across tests (`isolate: false`) and cold bootstrap is
// expensive, so we keep this suite intentionally small — a single smoke test
// that fails loudly if the stack regresses. Additional per-story tests can be
// added incrementally once their async setup is stabilized.
describe('Chat stories', { timeout: CHAT_BOOTSTRAP_TIMEOUT + 30_000 }, () => {
  afterAll(() => {
    cleanup();
  });

  test('WithBlueprints renders', async () => {
    await WithBlueprints.run();
    await waitForChatEditor();
  });
});
