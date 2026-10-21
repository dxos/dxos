//
// Copyright 2026 DXOS.org
//

/**
 * Light threads: three prompts sent while the agent researches run beside it, and one waits for it.
 *
 * @mdl packages/core/compute/trajectory/LIGHT-THREADS.mdl test QA-1
 * @app storybook via `DX_STORIES=stories/stories-assistant moon run storybook-react:serve` on :9009,
 *   story `stories-stories-assistant-lightthreads--demo` in isolation mode
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
    name: 'Start the research',
    narration: 'The agent starts a long research task, one calculator call at a time.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Start a long task', subtitle: 'LIGHT-THREADS.mdl QA-1' });
      await send({ demo, page }, 'Research the factorials of 5 to 9 and summarise them.');
      await page
        .getByText(/Computing 6!/)
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 });
    },
  },
  {
    name: 'Ask a quick question',
    narration: 'A question sent meanwhile starts a light thread; the research moves into a background card.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Ask something else while it works', subtitle: 'a light thread starts in parallel' });
      await send({ demo, page }, 'Meanwhile, what is 17 × 23?');
      await page.locator('[data-testid="chat.lane-card"]').first().waitFor({ state: 'visible', timeout: 30_000 });
      await page.getByText('17 × 23 = 391.').first().waitFor({ state: 'visible', timeout: 30_000 });
    },
  },
  {
    name: 'Ask another',
    narration: 'Each thread has its own colour in the gutter.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'And another', subtitle: 'each thread gets its own colour' });
      await send({ demo, page }, 'And what is the capital of Australia?');
      await page.getByText('Canberra.').first().waitFor({ state: 'visible', timeout: 30_000 });
    },
  },
  {
    name: 'Ask something that depends on the research',
    narration: 'This one depends on the research, so the model decides to wait for that thread.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Ask something that depends on the research', subtitle: 'the thread waits for it' });
      await send({ demo, page }, 'When the research is done, translate its summary into French.');
      await page
        .locator('[data-testid="chat.lane-header"][data-lane-status="waiting"]')
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 });
    },
  },
  {
    name: 'Watch the research finish',
    narration:
      'When the research finishes, its answer is echoed at the end, and the waiting thread continues with it. Every thread lives in the same local-first chat log.',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'The research finishes',
        subtitle: 'its answer is echoed; the waiting thread continues',
      });
      await page
        .getByText(/chacun est le précédent/)
        .first()
        .waitFor({ state: 'visible', timeout: 90_000 });
      await demo.sleep({ ms: 6_000 });
    },
  },
];
