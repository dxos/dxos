//
// Copyright 2026 DXOS.org
//

/**
 * What the agent is doing, at a glance: the chat beside a compressed git graph of it. Finished tasks sit on the
 * trunk; each thread still running is a branch, subagents branch off the thread that delegated them, and prompts the
 * agent has yet to take wait on a branch of their own. No message or tool call shows.
 *
 * @title Agent overview graph
 * @mdl packages/core/compute/compute/docs/trajectory/LIGHT-THREADS.mdl test QA-5
 * @app storybook via `DX_STORIES=stories/stories-assistant moon run storybook-react:serve` on :9009,
 *   story `stories-stories-assistant-agentoverview--demo` in isolation mode
 */

const PROMPT = '[data-testid="assistant.prompt"] .cm-content';
const OVERVIEW = '[data-testid="trajectory-overview"]';

const send = async ({ demo, page }, value) => {
  await demo.click({ selector: PROMPT, label: 'Prompt' });
  await demo.type({ selector: PROMPT, value, delay: 30 });
  await demo.press({ key: 'Enter', hud: false });
  await page.getByText(value, { exact: false }).first().waitFor({ state: 'visible', timeout: 15_000 });
};

/** Waits until the overview holds a row matching `text`. */
const row = (page, text) =>
  page.locator(OVERVIEW).getByText(text).first().waitFor({ state: 'visible', timeout: 60_000 });

export const steps = [
  {
    name: 'Open the story',
    setup: true,
    run: async ({ page }) => {
      await page.locator(PROMPT).first().waitFor({ state: 'visible', timeout: 120_000 });
      await page.locator(OVERVIEW).first().waitFor({ state: 'visible', timeout: 60_000 });
    },
  },
  {
    name: 'Ask for a comparison',
    narration: 'The agent hands each plan to a subagent; two run, and the third waits for a free slot.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Delegate to subagents', subtitle: 'they branch off the thread that started them' });
      await send({ demo, page }, 'Compare three savings plans for $10,000 at 4%, 6% and 8% a year over 30 years.');
      await row(page, /Plan C · 8% · queued/);
      await demo.sleep({ ms: 2_000 });
    },
  },
  {
    name: 'Start a long task beside it',
    narration: 'A second request runs in parallel, as a branch of its own.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Start a long task beside it', subtitle: 'a light thread runs in parallel' });
      await send({ demo, page }, 'Meanwhile, research the factorials of 5 to 9 and summarise them.');
      await page
        .getByText(/Computing 5!/)
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 });
    },
  },
  {
    name: 'Ask for something that depends on it',
    narration: 'This one needs the research, so its thread waits, and the graph says for what.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Ask for something that depends on it', subtitle: 'the thread waits' });
      await send({ demo, page }, 'When the research is done, translate its summary into French.');
      await row(page, /waiting for Meanwhile, research/);
    },
  },
  {
    name: 'Queue two more prompts',
    narration: 'Two threads already run, so the next prompts queue: that is what the agent will do next.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Queue two more prompts', subtitle: 'what the agent will do next' });
      await send({ demo, page }, 'What is 17 × 23?');
      await send({ demo, page }, 'And what is the capital of Australia?');
      await row(page, /2 queued/);
      await demo.sleep({ ms: 3_000 });
    },
  },
  {
    name: 'Watch the work finish',
    narration:
      'As work finishes, subagents collapse into their thread and threads into the trunk, and queued prompts start.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Finished work collapses', subtitle: 'queued prompts start as threads free up' });
      await demo.speed({ factor: 3 });
      await row(page, /subagent: Plan A/);
      await page
        .locator(OVERVIEW)
        .getByText(/0 running/)
        .first()
        .waitFor({ state: 'visible', timeout: 150_000 });
      await demo.speed({ factor: 1 });
    },
  },
  {
    name: 'Hold the result',
    narration: 'Every thread is a branch of one local-first chat log, so the overview is a fold over it.',
    run: async ({ demo }) => {
      await demo.caption({ value: 'Only the trunk remains', subtitle: 'what the agent did, at a glance' });
      await demo.sleep({ ms: 8_000 });
    },
  },
];
