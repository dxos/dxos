//
// Copyright 2026 DXOS.org
//

/**
 * Customers write to a support inbox; a pipeline extracts who they are and what they asked, drafts a cited reply when
 * a document answers, and makes a task when none does. A support agent then picks up those tasks: it keeps the ones
 * that need a person, and hands each question it can research to a session of its own, which writes the missing
 * document, drafts a cited reply and closes its task.
 *
 * @title A support agent picks up the inbox's tasks
 * @mdl packages/core/compute/compute/AGENT-DELEGATION.mdl test QA-2
 * @app storybook via `DX_STORIES=stories/stories-assistant,stories/stories-support moon run storybook-react:serve` on
 *   :9009, story `stories-stories-assistant-support-supportagent--default` in isolation mode
 */

const MESSAGES = '[data-testid="support.messages"]';
const TASKS = '[data-testid="support.tasks"]';
const DRAFTS = '[data-testid="support.drafts"]';
const COLUMN = '[data-testid="chat-plane.column"]';

/** Rows of one of the support columns. */
const rowCount = (page, list) => page.locator(`[data-testid="${list}"] [data-testid="${list}.item"]`).count();

/** Waits until a support column holds `count` rows. */
const waitForRows = async (page, list, count, timeout = 60_000) => {
  const deadline = Date.now() + timeout;
  while ((await rowCount(page, list)) < count) {
    if (Date.now() > deadline) {
      throw new Error(`${list} has ${await rowCount(page, list)} rows, not ${count}.`);
    }
    await page.waitForTimeout(250);
  }
};

/** Waits for `text` anywhere in the first element `selector` matches. */
const waitForText = (page, selector, text, timeout = 60_000) =>
  page.locator(selector).getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout });

export const steps = [
  {
    name: 'Open the story',
    setup: true,
    run: async ({ page }) => {
      await page.locator('[data-testid="support.play"]').waitFor({ state: 'visible', timeout: 120_000 });
      await page.locator('[data-testid="chat.suggestion"]').first().waitFor({ state: 'visible', timeout: 120_000 });
    },
  },
  {
    name: 'Start the generators',
    narration:
      'Customers write to a support inbox. Each message runs through a pipeline that records who sent it and what they asked.',
    run: async ({ demo, page }) => {
      await demo.title({
        value: 'A support agent picks up the tasks',
        subtitle: 'AGENT-DELEGATION.mdl QA-2',
        hold: 3_600,
      });
      await demo.caption({ value: 'Customers write to the support inbox', subtitle: 'start the generators' });
      await demo.click({ selector: '[data-testid="support.play"]', label: 'Start the generators' });
      await waitForRows(page, 'support.messages', 4, 30_000);
      await demo.sleep({ ms: 1_500 });
    },
  },
  {
    name: 'Watch the pipeline answer or make tasks',
    narration:
      'A question a document answers gets a draft that cites it. Everything else becomes a task: requests, and questions no document covers.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Answered from documents, or left as a task', subtitle: 'drafts and tasks' });
      await demo.hover({ selector: '[data-testid="support.run"]', label: 'Pipeline' });
      await waitForRows(page, 'support.messages', 12, 60_000);
      await waitForRows(page, 'support.tasks', 6, 30_000);
      await waitForRows(page, 'support.drafts', 7, 30_000);
      await demo.hover({ selector: TASKS, label: 'Tasks' });
      await demo.sleep({ ms: 2_000 });
    },
  },
  {
    name: 'Ask the agent to work the tasks',
    narration:
      'The support agent reads the open tasks. Account requests and a question that needs the customer’s logs stay with the team.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'The agent picks up the open tasks', subtitle: 'requests stay with people' });
      await demo.click({ selector: '[data-testid="chat.suggestion"]', label: 'Work the open support tasks' });
      await waitForText(page, COLUMN, 'Handing the Hyperdrive question', 60_000);
      await demo.sleep({ ms: 1_000 });
    },
  },
  {
    name: 'Watch the sessions start',
    narration:
      'Each question it can research goes to a session of its own. The task is assigned to that session, and the Tasks column shows who has it.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'A session per question', subtitle: 'the task is assigned to it' });
      await waitForText(page, COLUMN, 'Two sessions are answering', 60_000);
      await waitForText(page, TASKS, 'Given to', 30_000);
      await demo.hover({ selector: `${TASKS} >> text=/Given to/`, label: 'Given to a session' });
      await demo.sleep({ ms: 2_000 });
    },
  },
  {
    name: 'Watch the sessions answer',
    narration:
      'One session writes the missing Hyperdrive document and answers from it; the other retries a search that timed out.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Research, then a cited draft', subtitle: 'the pipeline’s own rule' });
      await waitForText(page, COLUMN, 'Writing a Hyperdrive document', 60_000);
      await demo.click({ selector: `${COLUMN} >> text=Research Hyperdrive and Aurora`, label: 'Hyperdrive session' });
      await waitForText(page, COLUMN, 'Drafted the reply to Eli Novak', 90_000);
      await waitForText(page, COLUMN, 'Drafted the reply to Dara Singh', 90_000);
      await waitForRows(page, 'support.drafts', 9, 30_000);
      await demo.sleep({ ms: 1_500 });
    },
  },
  {
    name: 'Check the drafts and the tasks',
    narration:
      'Both drafts cite a document in the space, and both tasks are done. Agents and people work the same tasks, in the same space.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Two cited drafts, two tasks done', subtitle: 'ready for a person to send' });
      await demo.hover({ selector: `${DRAFTS} >> text=/Cites Hyperdrive/`, label: 'Cites Hyperdrive' });
      await waitForText(page, TASKS, 'Done by', 30_000);
      await demo.sleep({ ms: 2_000 });
      await demo.hover({ selector: `${TASKS} >> text=/Done by/`, label: 'Done' });
      await demo.sleep({ ms: 9_000 });
    },
  },
];
