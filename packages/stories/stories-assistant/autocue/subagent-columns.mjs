//
// Copyright 2026 DXOS.org
//

/**
 * Subagent columns: the reader hands the agent four launch tasks; it delegates them one by one, and each subagent
 * thread opens as a column of its own, holding its conversation and the document it wrote.
 *
 * @title Subagent columns
 * @mdl packages/core/compute/compute/docs/trajectory/LIGHT-THREADS.mdl test QA-6
 * @app storybook via `DX_STORIES=stories/stories-assistant moon run storybook-react:serve` on :9009,
 *   story `stories-stories-assistant-subagents--columns` in isolation mode
 */

const START = '[data-testid="launch.start"]';
const COLUMN = '[data-testid="chat-plane.column"]';
const TASK = '[data-testid="launch.task"]';

/** Waits until `count` elements match `selector`. */
const waitForCount = async (page, selector, count, timeout) =>
  page.waitForFunction(([selector, count]) => document.querySelectorAll(selector).length >= count, [selector, count], {
    timeout,
  });

export const steps = [
  {
    name: 'Open the story',
    setup: true,
    run: async ({ page }) => {
      await page.locator(START).waitFor({ state: 'visible', timeout: 120_000 });
      await page.locator(COLUMN).first().waitFor({ state: 'visible', timeout: 60_000 });
    },
  },
  {
    name: 'Hand over the tasks',
    narration: 'Four launch tasks go to one agent, which splits them up instead of working through them in turn.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Hand the agent four tasks', subtitle: 'LIGHT-THREADS.mdl QA-6' });
      await demo.click({ selector: START, label: 'Delegate' });
      await waitForCount(page, COLUMN, 2, 30_000);
    },
  },
  {
    name: 'Watch the columns open',
    narration: 'Each task goes to a subagent in a thread of its own, and each thread opens as a column.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'A column opens per subagent', subtitle: 'one thread per task, in parallel' });
      await waitForCount(page, COLUMN, 5, 60_000);
    },
  },
  {
    name: 'Watch the subagents work',
    narration: 'Every subagent streams its own conversation and ends with the document it wrote, shown as a card.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'The subagents work side by side', subtitle: 'each writes a document' });
      await waitForCount(page, `${TASK}[data-status="done"]`, 4, 120_000);
      await demo.sleep({ ms: 1_500 });
    },
  },
  {
    name: 'Step back through the threads',
    narration: 'The task list follows each thread; a click brings its column back into view.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Revisit each thread', subtitle: 'the task list follows every column' });
      const count = await page.locator(TASK).count();
      for (let index = 0; index < count; index++) {
        await demo.click({ selector: `${TASK} >> nth=${index}`, label: `Task ${index + 1}` });
        await demo.sleep({ ms: 1_800 });
      }
    },
  },
  {
    name: "Read the agent's summary",
    narration: 'The agent hears back from every subagent and sums up, while all four documents stay in their columns.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'The agent sums up', subtitle: 'only the answers join its conversation' });
      await demo.click({ selector: `${COLUMN} >> nth=0`, label: 'Agent' });
      await page.getByText('All four launch tasks are done').first().waitFor({ state: 'visible', timeout: 60_000 });
      await demo.sleep({ ms: 8_000 });
    },
  },
];
