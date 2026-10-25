//
// Copyright 2026 DXOS.org
//

/**
 * Agent multi-tenancy: DeepSeek V4 Flash and Claude Code work in one chat, each in lanes it owns.
 *
 * @mdl packages/core/compute/trajectory/LIGHT-THREADS.mdl test QA-2
 * @app storybook via `DX_STORIES=plugins/plugin-assistant,stories/stories-assistant moon run storybook-react:serve`
 *   on :9009, story `stories-stories-assistant-multitenantthreads--demo` in isolation mode
 */

const PROMPT = '[data-testid="assistant.prompt"] .cm-content';

const send = async ({ demo, page }, value) => {
  await demo.click({ selector: PROMPT, label: 'Prompt' });
  await demo.type({ selector: PROMPT, value, delay: 35 });
  await demo.press({ key: 'Enter', hud: false });
  await page.getByText(value, { exact: false }).first().waitFor({ state: 'visible', timeout: 15_000 });
};

export const steps = [
  {
    name: 'Open the story',
    setup: true,
    run: async ({ page }) => {
      await page.locator(PROMPT).first().waitFor({ state: 'visible', timeout: 120_000 });
    },
  },
  {
    name: 'Ask the default agent for a plan',
    narration: 'The chat runs on DeepSeek V4 Flash, which starts working out a plan step by step.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Ask the chat’s agent for a plan', subtitle: 'DeepSeek V4 Flash (scripted)' });
      await send({ demo, page }, 'Draft a three-step plan for migrating the chat store to events.');
      await page
        .getByText(/Step 1…/)
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 });
    },
  },
  {
    name: 'Address Claude Code',
    narration: 'A prompt addressed to Claude Code runs on that agent, in a lane of its own.',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Address another agent with @claude',
        subtitle: 'Claude Code (scripted) gets its own lane',
      });
      await send({ demo, page }, '@claude Find where TrajectoryStore folds the prompt and list the files.');
      await page
        .locator('[data-testid="chat.lane-header"]', { hasText: 'claude' })
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 });
    },
  },
  {
    name: 'Ask the default agent something quick',
    narration: 'Meanwhile the chat’s own agent answers a quick question in a third lane.',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Ask something quick meanwhile',
        subtitle: 'each lane names the agent that owns it',
      });
      await send({ demo, page }, 'Meanwhile, how many events does a turn write at least?');
      await page
        .getByText(/At least three/)
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 });
    },
  },
  {
    name: 'Watch both agents finish',
    narration:
      'Both agents finish in the same chat log, each seeing what the other was doing. The same threads can host any number of agents.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Both agents finish', subtitle: 'one chat, two agents, one shared log' });
      await page
        .getByText(/promptFold/)
        .first()
        .waitFor({ state: 'visible', timeout: 60_000 });
      await page
        .getByText(/Cache folded state/)
        .first()
        .waitFor({ state: 'visible', timeout: 60_000 });
      await demo.sleep({ ms: 6_000 });
    },
  },
];
