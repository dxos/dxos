//
// Copyright 2026 DXOS.org
//

/**
 * A mail sync that runs out of time continues, run by run, until the mailbox is synced.
 *
 * @mdl packages/plugins/plugin-inbox/PLUGIN.mdl test QA-3
 * @app storybook via `DX_STORIES=stories/stories-inbox VITE_DX_DISABLE_ANIMATIONS=true moon run storybook-react:serve`
 *   on :9009, story `/iframe.html?id=stories-stories-inbox-mailboxsyncchain--interactive&viewMode=story`
 *
 * `Interactive` is `Default` without its `play` function, which would otherwise press Sync before the take.
 */

const PANEL = '[data-testid="sync-runs.list"]';
const SYNC = '[data-testid="sync-runs.sync"]';
const TOTAL = '[data-testid="sync-runs.total"]';

/** Waits until the run row `index` shows `status`. */
const waitForRun = (page, index, status, timeout = 30_000) =>
  page.locator(`[data-testid="sync-runs.run-${index}"]`).getByText(status).waitFor({ state: 'visible', timeout });

export const steps = [
  {
    name: 'Load the story',
    setup: true,
    run: async ({ page }) => {
      await page.locator(SYNC).waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForFunction((selector) => !document.querySelector(selector)?.hasAttribute('disabled'), SYNC, {
        timeout: 30_000,
      });
    },
  },
  {
    name: 'Start the sync',
    narration: 'A mock mailbox of 120 messages. Each run may spend four seconds taking messages.',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Mail sync on a time budget', subtitle: 'dxos/dxos#14243', hold: 3_000 });
      await demo.caption({
        value: 'Each run stops taking messages when its budget is spent',
        subtitle: 'QA-3 · plugin-inbox/PLUGIN.mdl · 4s here, 40s on EDGE',
      });
      await demo.click({ selector: SYNC, label: 'Sync' });
      await waitForRun(page, 1, 'running', 10_000);
    },
  },
  {
    name: 'Watch the first run stop at its budget',
    narration: 'The first run passes its budget, saves its position, and asks to run again.',
    run: async ({ demo, page }) => {
      await waitForRun(page, 1, 'out of time → continues');
      await demo.caption({
        value: 'Run 1 is out of time: it keeps what it committed and requests another run',
        subtitle: 'Operation.runAgain()',
      });
      await waitForRun(page, 2, 'running', 10_000);
    },
  },
  {
    name: 'Watch the chain complete',
    narration: 'Each later run continues from where the last one stopped, until the mailbox is complete.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Each run continues from where the last one stopped' });
      await page.locator(TOTAL).getByText('120 / 120 messages').waitFor({ state: 'visible', timeout: 90_000 });
      await page.locator(PANEL).getByText('complete', { exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
      await demo.caption({ value: 'All 120 messages synced, each exactly once', subtitle: 'no run hit the deadline' });
      await demo.sleep({ ms: 2_500 });
    },
  },
];
