//
// Copyright 2026 DXOS.org
//

import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Two real agents in one chat: DeepSeek V4 Flash draws a flowchart on a canvas while Claude Code edits files, and
 * neither prompts the other.
 *
 * @mdl packages/core/compute/trajectory/LIGHT-THREADS.mdl test QA-3
 * @app storybook via `DX_STORIES=plugins/plugin-assistant,stories/stories-assistant moon run storybook-react:serve`
 *   on :9009, story `stories-stories-assistant-multitenantthreads--live` in isolation mode with
 *   `&helperPort=<port>&helperToken=<token>&cwd=<folder>` appended; the agent helper (plugin-code
 *   `src/agent-helper/server.ts`) serves `claude-code` on that port with `ANTHROPIC_API_KEY` set, and `<folder>` is a
 *   git repo holding only `notes.txt`. Set `DEMO_CWD` to the same folder so the flow can check the files on disk.
 */

const PROMPT = '[data-testid="assistant.prompt"] .cm-content';
const CWD = process.env.DEMO_CWD;

const send = async ({ demo, page }, value) => {
  await demo.click({ selector: PROMPT, label: 'Prompt' });
  await demo.type({ selector: PROMPT, value, delay: 25 });
  await demo.press({ key: 'Enter', hud: false });
  await page.getByText(value.slice(0, 40), { exact: false }).first().waitFor({ state: 'visible', timeout: 15_000 });
};

/** Requests and lanes the chat shows, so the run-off check compares like with like. */
const counts = async (page) => ({
  requests: await page.locator('[data-testid="assistant.request"]').count(),
  lanes: await page.locator('[data-testid="chat.lane-header"]').count(),
});

const until = async (check, timeout) => {
  const deadline = Date.now() + timeout;
  while (!(await check())) {
    if (Date.now() > deadline) {
      throw new Error('Timed out.');
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
};

export const steps = [
  {
    name: 'Open the story',
    setup: true,
    run: async ({ page }) => {
      await page.locator(PROMPT).first().waitFor({ state: 'visible', timeout: 120_000 });
      await page.locator('.tl-canvas').first().waitFor({ state: 'visible', timeout: 60_000 });
    },
  },
  {
    name: 'Ask the assistant for a diagram',
    narration: 'The chat runs on DeepSeek V4 Flash, live through EDGE, and draws on the canvas beside it.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Ask the assistant for a diagram', subtitle: 'DeepSeek V4 Flash, live via EDGE' });
      await send(
        { demo, page },
        'Draw the coffee blend launch as a flowchart in the Launch plan drawing — Source beans, Roast, Package, Launch party, connected by arrows.',
      );
      await page.locator('[data-testid="assistant.tool-run"]').first().waitFor({ state: 'visible', timeout: 60_000 });
    },
  },
  {
    name: 'Ask Claude Code to manage the files',
    narration: 'While it draws, a prompt to Claude Code runs live on that agent, in a lane of its own.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Meanwhile, @claude edits files', subtitle: 'real Claude Code over ACP' });
      await send(
        { demo, page },
        '@claude In this folder, write README.md about the coffee blend launch, create checklist.md with the four launch steps, rename notes.txt to beans.txt, then list the files.',
      );
    },
  },
  {
    name: 'Watch both finish',
    narration: 'The flowchart lands on the canvas, and Claude Code lists the files it wrote.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Both agents work at once', subtitle: 'one chat, two live agents' });
      await page.locator('.tl-shape').nth(6).waitFor({ state: 'attached', timeout: 180_000 });
      if (CWD) {
        await until(
          () =>
            ['README.md', 'checklist.md', 'beans.txt'].every((file) => existsSync(join(CWD, file))) &&
            !existsSync(join(CWD, 'notes.txt')),
          180_000,
        );
      }
      await page
        .getByText(/checklist\.md\s*[–—-]/)
        .first()
        .waitFor({ state: 'visible', timeout: 180_000 });
      await demo.sleep({ ms: 3_000 });
    },
  },
  {
    name: 'Check that nothing runs on',
    narration: 'Their replies may name each other, but only a person’s prompt starts a turn, so nothing runs on.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Nothing runs on', subtitle: 'agents never prompt each other' });
      const before = await counts(page);
      await demo.sleep({ ms: 10_000 });
      const after = await counts(page);
      if (after.requests !== before.requests || after.lanes !== before.lanes) {
        throw new Error(`Run-off: ${JSON.stringify({ before, after })}`);
      }
    },
  },
];
