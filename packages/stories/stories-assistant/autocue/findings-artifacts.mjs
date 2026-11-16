//
// Copyright 2026 DXOS.org
//

/**
 * An agent reads five findings about the Cloudflare Developers Discord and turns them into artifacts beside the
 * chat: a sheet with a chart for each finding, a deck with one slide per chart, and a markdown summary. The agent
 * has only the sheet, presenter and markdown skills; every object it makes appears in the Artifacts panel as it is
 * created.
 *
 * @title Findings to artifacts
 * @mdl packages/plugins/plugin-sheet/PLUGIN.mdl test QA-6
 * @app storybook via `DX_STORIES=stories/stories-assistant moon run storybook-react:serve` on :9009,
 *   story `stories-stories-assistant-artifacts--with-findings` in isolation mode, with a live model
 */

const PROMPT = '[data-testid="assistant.prompt"] .cm-content';
const ACTIVITY = '[data-testid="assistant.chat-activity"]';
const TAB = (kind) => `[data-artifact="${kind}"]`;

const REQUEST =
  'Turn the five findings in the bound document into artifacts: for each finding create a sheet with its table and a chart that fits it (bar to compare, pie for shares, xy over time). Then create a presentation with one slide per chart, and a short markdown summary of the five findings.';

/** Resolves once the chat's activity line (Generating, Contacting inference provider, …) has been gone for `quiet` ms. */
const agentIdle = async (page, { quiet = 4_000, timeout = 300_000 } = {}) => {
  const deadline = Date.now() + timeout;
  let since = Date.now();
  while (Date.now() < deadline) {
    const busy = await page.evaluate(
      (selector) => (document.querySelector(selector)?.textContent?.trim() ?? '') !== '',
      ACTIVITY,
    );
    if (busy) {
      since = Date.now();
    } else if (Date.now() - since >= quiet) {
      return;
    }
    await page.waitForTimeout(500);
  }
  throw new Error('The agent was still working after the timeout.');
};

/** Clicks the first tab of a kind whose label matches, falling back to the first tab of that kind. */
const openTab = async ({ demo, page }, kind, pattern, label) => {
  const tabs = page.locator(TAB(kind));
  const named = tabs.filter({ hasText: pattern });
  const target = (await named.count()) > 0 ? named.first() : tabs.first();
  const text = (await target.textContent())?.trim() ?? label;
  await target.scrollIntoViewIfNeeded();
  await demo.click({ selector: `${TAB(kind)}:has-text(${JSON.stringify(text)})`, label: text });
  return text;
};

export const steps = [
  {
    name: 'Open the story',
    setup: true,
    run: async ({ page }) => {
      await page.locator(PROMPT).first().waitFor({ state: 'visible', timeout: 120_000 });
      await page.getByText('Artifacts the agent creates appear here.').waitFor({ state: 'visible', timeout: 30_000 });
    },
  },
  {
    name: 'Ask for the artifacts',
    narration: 'The agent is asked to chart each finding, then build a deck and a summary.',
    run: async ({ demo, page }) => {
      await demo.title({
        value: 'Findings to artifacts',
        subtitle: 'Sheets, charts, a deck and a summary',
        hold: 3600,
      });
      await demo.caption({ value: 'Ask the agent to chart each finding', subtitle: 'plugin-sheet PLUGIN.mdl QA-6' });
      await demo.click({ selector: PROMPT, label: 'Prompt' });
      await demo.type({ selector: PROMPT, value: REQUEST, delay: 8 });
      await demo.press({ key: 'Enter', hud: false });
      await demo.caption({
        value: 'Each sheet appears beside the chat as the agent makes it',
        subtitle: 'sheet skill: Create, Set Values, Add Chart',
      });
      await page.locator(TAB('sheet')).first().waitFor({ state: 'visible', timeout: 120_000 });
      await demo.speed({ factor: 6 });
      await page.locator(TAB('document')).first().waitFor({ state: 'visible', timeout: 300_000 });
      await page.locator(TAB('presentation')).first().waitFor({ state: 'visible', timeout: 60_000 });
      await agentIdle(page);
      await demo.speed({ factor: 1 });
    },
  },
  {
    name: 'Read the deck',
    narration: 'The deck has a cover slide and one slide per chart.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'A deck with one slide per chart', subtitle: 'presenter skill' });
      await openTab({ demo, page }, 'presentation', /./, 'Presentation');
      await page.locator('[data-artifact="presentation"][data-state="on"]').waitFor({ timeout: 10_000 });
      await demo.sleep({ ms: 3000 });
    },
  },
  {
    name: 'Open a sheet',
    narration: 'Each sheet holds its finding as a table, with its chart below.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Who answers first: the table, and its chart below', subtitle: 'finding 1' });
      await openTab({ demo, page }, 'sheet', /who answers/i, 'Sheet');
      await page.locator('dx-grid').first().waitFor({ state: 'visible', timeout: 10_000 });
      await page
        .locator('svg')
        .filter({ has: page.locator('rect') })
        .first()
        .waitFor({ timeout: 15_000 });
      await demo.sleep({ ms: 3000 });
    },
  },
  {
    name: 'Open the product tone sheet',
    narration: 'Product mentions and tone, charted the way the agent chose.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Product mentions and tone', subtitle: 'finding 4 — the agent picks the chart' });
      await openTab({ demo, page }, 'sheet', /product/i, 'Sheet');
      await page.locator('dx-grid').first().waitFor({ state: 'visible', timeout: 10_000 });
      await demo.sleep({ ms: 3000 });
    },
  },
  {
    name: 'Read the summary',
    narration: 'And a short summary of all five findings.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'A markdown summary of the five findings', subtitle: 'markdown skill' });
      await openTab({ demo, page }, 'document', /./, 'Summary');
      await page.locator('[data-artifact="document"][data-state="on"]').waitFor({ timeout: 10_000 });
      await demo.sleep({ ms: 3500 });
      await demo.clearCaption();
    },
  },
];
