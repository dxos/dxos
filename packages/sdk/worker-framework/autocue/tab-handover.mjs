//
// Copyright 2026 DXOS.org
//

/**
 * Browser tabs hand the worker to each other only with the user's consent. Each card is a tab with its
 * own connection: one build shares the worker, an older build pauses when a newer one opens, and a tab
 * that cannot reach the leader asks before taking over.
 *
 * @title Tab hand-over
 * @mdl packages/sdk/worker-framework/SPEC.mdl test QA-1
 * @app storybook via `moon run storybook-react:serve-nodeps -- --port=9009`, story
 *   `sdk-worker-framework-tabhandover--default` in isolation
 */

const SUBTITLE = 'from worker-framework/SPEC.mdl QA-1';

const tab = (id, part = '') => `[data-testid="tab-${id}${part ? `-${part}` : ''}"]`;

/** Waits until tab `id` reads `text` in its status line or pause reason. */
const waitForTab = (page, id, text, timeout = 30_000) =>
  page.waitForFunction(
    ({ id, text }) =>
      [`tab-${id}-status`, `tab-${id}-reason`].some((testId) =>
        document.querySelector(`[data-testid="${testId}"]`)?.textContent?.includes(text),
      ),
    { id, text },
    { timeout },
  );

/** Opens a paused tab's Details, so the reason is on screen. */
const showDetails = async (page, id) => {
  await page.evaluate((id) => {
    const details = document.querySelector(`[data-testid="tab-${id}"] details`);
    if (details) {
      details.open = true;
    }
  }, id);
};

export const steps = [
  {
    name: 'Wait for the first tab to lead',
    setup: true,
    run: async ({ page }) => {
      await waitForTab(page, 1, 'Leader', 120_000);
    },
  },
  {
    name: 'Share the worker on one build',
    narration: 'Two tabs on one build share a single worker: one leads, the other uses it.',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Tab hand-over', subtitle: 'sdk/worker-framework', hold: 3600 });
      await demo.caption({ value: 'Step 1 — Open a second tab on the same build', subtitle: SUBTITLE });
      await demo.click({ selector: '[data-testid="open-tab"]', label: 'Open tab' });
      await waitForTab(page, 2, 'Follower');
      await demo.click({ selector: tab(1, 'increment'), label: 'Increment' });
      await demo.click({ selector: tab(2, 'increment'), label: 'Increment' });
      await page.waitForFunction(() => document.querySelector('[data-testid="tab-2-count"]')?.textContent === '2');
      await demo.sleep({ ms: 4000 });
    },
  },
  {
    name: 'Open a newer build',
    narration: 'When a newer build opens, every tab on the older build pauses instead of fighting it.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Step 2 — Open a tab on a newer build', subtitle: SUBTITLE });
      await demo.click({ selector: '[data-testid="open-newer-tab"]', label: 'Open tab on a newer build' });
      await waitForTab(page, 1, 'Different versions open');
      await waitForTab(page, 3, 'Leader');
      await showDetails(page, 1);
      await demo.sleep({ ms: 4500 });
    },
  },
  {
    name: 'Continue on the older tab',
    narration: 'Continuing in the old tab loads the newer build there, and the tab it took over from pauses.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Step 3 — Continue here, on the first tab', subtitle: SUBTITLE });
      await demo.click({ selector: tab(1, 'continue'), label: 'Continue here' });
      await waitForTab(page, 1, 'Leader');
      await waitForTab(page, 3, 'Taken over by another tab');
      await showDetails(page, 3);
      await demo.sleep({ ms: 4500 });
    },
  },
  {
    name: 'Open a tab that cannot reach the leader',
    narration: 'A tab that cannot reach the leader does not take the worker on its own. It asks first.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Step 4 — Open a tab that cannot reach the leader', subtitle: SUBTITLE });
      await demo.click({ selector: '[data-testid="open-unreachable-tab"]', label: 'Open unreachable tab' });
      await waitForTab(page, 4, 'Take over from an unresponsive tab');
      await showDetails(page, 4);
      await demo.click({ selector: tab(1, 'increment'), label: 'Increment' });
      await demo.sleep({ ms: 4500 });
    },
  },
  {
    name: 'Take over from it',
    narration: 'Choosing Continue here takes the worker over, and the former leader pauses until you return to it.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Step 5 — Continue here, on the unreachable tab', subtitle: SUBTITLE });
      await demo.click({ selector: tab(4, 'continue'), label: 'Continue here' });
      await waitForTab(page, 4, 'Leader');
      await waitForTab(page, 1, 'Taken over by another tab');
      await showDetails(page, 1);
      await demo.sleep({ ms: 3000 });
    },
  },
  {
    name: 'One tab owns the data at a time',
    narration:
      'Exactly one tab runs the worker at any moment, so local data is written by one owner while the others wait, with nothing lost between them.',
    run: async ({ demo }) => {
      await demo.caption({ value: 'One tab owns the worker; you choose every hand-over', subtitle: SUBTITLE });
      await demo.sleep({ ms: 10_000 });
    },
  },
];
