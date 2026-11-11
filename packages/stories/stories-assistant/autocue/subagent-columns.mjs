//
// Copyright 2026 DXOS.org
//

/**
 * Subagent columns: the reader asks for a launch kit; the agent puts four tasks on its checklist and delegates each to a
 * subagent, whose thread opens as a column showing its reasoning, the document it writes and its slice of memory. The
 * reader keeps talking meanwhile; each column closes once its subagent reports, and the result lands in the agent's
 * column.
 *
 * @title Subagent columns
 * @mdl packages/core/compute/compute/docs/trajectory/LIGHT-THREADS.mdl test QA-6
 * @app storybook via `DX_STORIES=stories/stories-assistant moon run storybook-react:serve` on :9009,
 *   story `stories-stories-assistant-subagents--columns` in isolation mode
 */

const PROMPT = '[data-testid="assistant.prompt"] .cm-content';
const COLUMN = '[data-testid="chat-plane.column"]';
const AGENT = `${COLUMN} >> nth=0`;

/** Waits until exactly `count` elements match `selector`. */
const waitForCount = async (page, selector, count, timeout) =>
  page.waitForFunction(([selector, count]) => document.querySelectorAll(selector).length === count, [selector, count], {
    timeout,
  });

const send = async ({ demo, page }, value) => {
  await demo.click({ selector: PROMPT, label: 'Prompt' });
  await demo.type({ selector: PROMPT, value, delay: 30 });
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
    name: 'Describe a complex task',
    narration: 'One request, too big for a single thread: four documents for a product launch.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Ask for something big', subtitle: 'LIGHT-THREADS.mdl QA-6' });
      await send(
        { demo, page },
        'Plan the Composer 1.0 launch: we need a blog post, release notes, an FAQ and an announcement email.',
      );
    },
  },
  {
    name: 'See the task list',
    narration: 'The agent breaks the request into a checklist you can see in the chat.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'The agent writes a task list', subtitle: 'one task per document' });
      const toggle = '[data-testid="assistant.toggle-tasks"]';
      await page.locator(toggle).waitFor({ state: 'visible', timeout: 30_000 });
      await demo.click({ selector: toggle, label: 'Tasks' });
      await page
        .getByText('Announcement email', { exact: true })
        .first()
        .waitFor({ state: 'visible', timeout: 15_000 });
      await demo.sleep({ ms: 1_500 });
    },
  },
  {
    name: 'Watch the columns open',
    narration: 'Each task goes to a subagent, and each subagent opens a column with its own stream of thought.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'A column per subagent', subtitle: 'each thinks out loud' });
      await waitForCount(page, COLUMN, 5, 60_000);
      await demo.sleep({ ms: 1_500 });
    },
  },
  {
    name: 'Keep talking',
    narration: 'The conversation is never blocked: a question sent meanwhile is answered at once.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Keep talking meanwhile', subtitle: 'the agent answers while they work' });
      await demo.click({ selector: AGENT, label: 'Agent' });
      await send({ demo, page }, 'While they work: which day should we launch?');
      await page.getByText('Tuesday the 18th').first().waitFor({ state: 'visible', timeout: 30_000 });
      await demo.sleep({ ms: 1_500 });
    },
  },
  {
    name: "Look inside a subagent's column",
    narration: 'Each column holds the document its subagent wrote, and the slice of memory it built along the way.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Artifacts and memory', subtitle: 'per subagent' });
      const faq = `${COLUMN}:has-text("FAQ ·")`;
      await demo.click({ selector: `${faq} >> [data-testid="launch.memory"]`, label: 'FAQ' });
      await page.locator(`${faq} >> text=Wrote`).first().waitFor({ state: 'visible', timeout: 60_000 });
      await demo.sleep({ ms: 2_500 });
    },
  },
  {
    name: 'Watch the columns close',
    narration: 'As each subagent finishes, its column closes and its task is checked off.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Finished threads close', subtitle: 'their tasks are checked off' });
      await waitForCount(page, COLUMN, 1, 90_000);
    },
  },
  {
    name: 'Read the result',
    narration: 'The results come back to the main conversation, while every document stays in the space.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'The result comes back', subtitle: 'in the main conversation', position: 'top' });
      await page.getByText('The launch kit is ready').first().waitFor({ state: 'visible', timeout: 60_000 });
      await demo.sleep({ ms: 2_000 });
      // The checklist drawer sits over the end of the thread; closing it shows the summary in full.
      await demo.click({ selector: '[data-testid="assistant.toggle-tasks"]', label: 'Tasks' });
      // The agent's column does not follow a reply that lands while another column is selected, so scroll to it.
      await demo.hover({ selector: AGENT, label: 'Agent' });
      for (let tick = 0; tick < 6; tick++) {
        await page.mouse.wheel(0, 600);
        await demo.sleep({ ms: 150 });
      }
      await page.getByText('The launch kit is ready').first().scrollIntoViewIfNeeded();
      await demo.sleep({ ms: 9_000 });
    },
  },
];
