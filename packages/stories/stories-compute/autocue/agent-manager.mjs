//
// Copyright 2026 DXOS.org
//

/**
 * Prompt background agents locally and on EDGE, and watch their transcripts stream.
 *
 * @mdl packages/stories/stories-compute/STORIES.mdl test QA-1
 * @app storybook via `DX_STORIES=stories/stories-compute VITE_DX_DISABLE_ANIMATIONS=true moon run storybook-react:serve`
 *      on :9009, story `stories-stories-compute-agentmanager--edge-local`, with a local EDGE stack on :8787
 */

const SUBTITLE = 'from stories-compute/STORIES.mdl QA-1';
const PROMPT = '[data-testid="agent-prompt"]';

const cardCount = (page) => page.locator('[data-testid="process-tile"]').count();

const waitForCards = (page, count) =>
  page.waitForFunction((count) => document.querySelectorAll('[data-testid="process-tile"]').length >= count, count, {
    timeout: 30_000,
  });

const prompt = async (demo, page, text, count) => {
  await demo.click({ selector: PROMPT, label: 'Prompt' });
  await demo.type({ selector: PROMPT, value: text, delay: 35 });
  await demo.press({ key: 'Enter' });
  await waitForCards(page, count);
};

export const steps = [
  {
    name: 'Prompt a local agent',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Prompt a local agent', subtitle: SUBTITLE });
      await prompt(demo, page, 'Fix the flaky timeout in the sync engine tests', 1);
      await demo.sleep({ ms: 4_000 });
    },
  },
  {
    name: 'Prompt a second local agent',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Pick a suggestion — a second local agent runs alongside', subtitle: SUBTITLE });
      await demo.click({ text: 'Research the history of the Lisbon tram network', exact: true });
      await demo.click({ selector: '[data-testid="process-create"]', label: 'Create' });
      await waitForCards(page, 2);
      await demo.sleep({ ms: 3_000 });
    },
  },
  {
    name: 'Switch to EDGE',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Switch the location to EDGE', subtitle: SUBTITLE });
      await demo.click({ selector: '[data-testid="process-location-select"]', label: 'Location' });
      await demo.click({ selector: '[data-scope="select"][data-value="edge"]', label: 'EDGE' });
      await page.locator('[data-testid="process-location-select"]:has-text("EDGE")').waitFor({ timeout: 5_000 });
    },
  },
  {
    name: 'Prompt an EDGE agent',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Prompt an agent that runs on EDGE', subtitle: SUBTITLE });
      await prompt(demo, page, 'Analyze last quarter sales by region and chart the trend', 3);
      await demo.sleep({ ms: 3_000 });
    },
  },
  {
    name: 'Prompt a second EDGE agent',
    run: async ({ demo, page }) => {
      await prompt(demo, page, 'Schedule a design review with the platform team next week', 4);
      await page.locator('[data-testid="process-location"]:has-text("edge")').nth(1).waitFor({ timeout: 10_000 });
    },
  },
  {
    name: 'Let every agent finish',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Local and EDGE agents stream their transcripts, then finish', subtitle: SUBTITLE });
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll('[data-testid="process-state"]')].filter((row) =>
            row.textContent?.includes('SUCCEEDED'),
          ).length === 4,
        undefined,
        { timeout: 60_000 },
      );
      if ((await cardCount(page)) !== 4) {
        throw new Error('expected four cards');
      }
      await demo.sleep({ ms: 3_000 });
    },
  },
];
