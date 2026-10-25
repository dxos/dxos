//
// Copyright 2026 DXOS.org
//

/**
 * Subagents: the agent delegates three tasks to subagents that run in background threads, keeps answering the reader,
 * and compares their results once they report.
 *
 * @mdl packages/core/compute/trajectory/LIGHT-THREADS.mdl test QA-4
 * @app storybook via `DX_STORIES=stories/stories-assistant moon run storybook-react:serve` on :9009,
 *   story `stories-stories-assistant-subagents--demo` in isolation mode
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
    name: 'Ask for a comparison',
    narration: 'The agent splits the work and delegates each plan to a subagent of its own.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Ask for work that splits', subtitle: 'LIGHT-THREADS.mdl QA-4' });
      await send({ demo, page }, 'Compare three savings plans for $10,000 at 4%, 6% and 8% a year over 30 years.');
      await page.locator('[data-testid="chat.lane-card"]').nth(2).waitFor({ state: 'visible', timeout: 30_000 });
    },
  },
  {
    name: 'Watch the subagents work',
    narration:
      'Each subagent runs in a background thread that starts with nothing but its task, shown as a card of its own.',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Three subagents work in the background',
        subtitle: 'each starts with only its task',
      });
      await page
        .getByText(/After 20 years/)
        .first()
        .waitFor({ state: 'visible', timeout: 60_000 });
    },
  },
  {
    name: 'Ask a quick question',
    narration: 'While the agent waits for its subagents, a question sent meanwhile is answered at once.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Ask something else meanwhile', subtitle: 'a light thread answers at once' });
      await send({ demo, page }, 'Meanwhile, what is 17 × 23?');
      await page.getByText('17 × 23 = 391.').first().waitFor({ state: 'visible', timeout: 30_000 });
    },
  },
  {
    name: 'Watch the comparison arrive',
    narration:
      'Only each subagent’s final answer joins the conversation; the agent compares them once all three have reported.',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'The subagents report',
        subtitle: 'only their answers join the conversation',
      });
      await page
        .getByText(/two extra points a year/)
        .first()
        .waitFor({ state: 'visible', timeout: 120_000 });
      await demo.sleep({ ms: 6_000 });
    },
  },
];
