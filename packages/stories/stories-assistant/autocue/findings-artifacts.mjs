//
// Copyright 2026 DXOS.org
//

/**
 * An agent with a memory of the Cloudflare Developers Discord — the facts a crawl of sixty days of its product
 * channels extracted, served from disk — explores that memory with SPARQL, decides what is worth reporting, and turns
 * its findings into artifacts beside the chat: a sheet with a chart for each, a deck of the charts and a summary. No
 * finding is given to it; the flow only asks, waits, and opens what the agent made.
 *
 * @title Findings from memory
 * @mdl packages/plugins/plugin-sheet/PLUGIN.mdl test QA-6
 * @app storybook via `VITE_FACT_SERVER_URL=http://127.0.0.1:7701 DX_STORIES=stories/stories-assistant
 *   moon run storybook-react:serve`, story `stories-stories-assistant-chat-artifacts--from-memory` in isolation mode, with
 *   a live model and `DISCORD_FACTS_DB=<cloudflare-60d facts.db> DISCORD_FACT_SERVER_PORT=7701
 *   moon run plugin-discord:fact-server`
 */

const PROMPT = '[data-testid="assistant.prompt"] .cm-content';
const ACTIVITY = '[data-testid="assistant.chat-activity"]';
const TAB = (kind) => `[data-artifact="${kind}"]`;

const REQUEST =
  'Your memory holds facts extracted from sixty days of the Cloudflare Developers Discord. Explore it and find the five most interesting things about this community. For each finding, create a sheet with the data you queried and a chart that fits it. Then create a presentation with a cover slide and each chart object itself as a slide, and a separate markdown document summarising the five findings. Describe people by their role, never by name.';

/** Resolves once the chat's activity line (Generating, Contacting inference provider, …) has been gone for `quiet` ms. */
const agentIdle = async (page, { quiet = 6_000, timeout = 900_000 } = {}) => {
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

/** Clicks the `index`th tab of a kind (newest first; negative counts from the oldest) and returns its label. */
const openTab = async ({ demo, page }, kind, index = 0) => {
  const tabs = page.locator(TAB(kind));
  const count = await tabs.count();
  const target = tabs.nth(index < 0 ? count + index : index);
  const label = (await target.textContent())?.trim() ?? kind;
  await target.scrollIntoViewIfNeeded();
  await demo.click({ selector: `${TAB(kind)}:has-text(${JSON.stringify(label)})`, label });
  await page.locator(`${TAB(kind)}[data-state="on"]`).waitFor({ timeout: 10_000 });
  return label;
};

/** Shows one of the agent's sheets, captioned with the title the agent gave it. */
const showSheet = async ({ demo, page }, index, subtitle) => {
  const tabs = page.locator(TAB('sheet'));
  const count = await tabs.count();
  const label = (await tabs.nth(index < 0 ? count + index : index).textContent())?.trim() ?? 'A finding';
  await demo.caption({ value: label, subtitle });
  await openTab({ demo, page }, 'sheet', index);
  await page.locator('dx-grid').first().waitFor({ state: 'visible', timeout: 10_000 });
  await demo.sleep({ ms: 3500 });
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
    name: 'Ask for findings from memory',
    narration: 'The agent is asked to find what is interesting in its memory of the community, and to report it.',
    run: async ({ demo, page }) => {
      await demo.title({
        value: 'Findings from memory',
        subtitle: 'Cloudflare Developers Discord, 60 days',
        hold: 3600,
      });
      await demo.caption({ value: 'Ask the agent what its memory says', subtitle: 'plugin-sheet PLUGIN.mdl QA-6' });
      await demo.click({ selector: PROMPT, label: 'Prompt' });
      await demo.type({ selector: PROMPT, value: REQUEST, delay: 6 });
      await demo.press({ key: 'Enter', hud: false });
      await demo.caption({
        value: 'It explores the fact store, then builds what it found',
        subtitle: 'brain skill: Query SPARQL · sheet, presenter and markdown skills',
      });
      await demo.speed({ factor: 8 });
      await page.locator(TAB('sheet')).first().waitFor({ state: 'visible', timeout: 900_000 });
      await agentIdle(page);
      await demo.speed({ factor: 1 });
    },
  },
  {
    name: 'Read the deck',
    narration: 'The deck the agent made from its charts.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'The deck it made of its charts', subtitle: 'presenter skill' });
      await openTab({ demo, page }, 'presentation');
      await demo.sleep({ ms: 3500 });
    },
  },
  {
    name: 'Open the first finding',
    narration: 'Each finding is a sheet of the data the agent queried, with its chart.',
    run: async ({ demo, page }) => showSheet({ demo, page }, -1, 'the data it queried, and its chart'),
  },
  {
    name: 'Open the last finding',
    narration: 'Another finding, charted the way the agent chose.',
    run: async ({ demo, page }) => showSheet({ demo, page }, 0, 'the agent picks the chart'),
  },
  {
    name: 'Read the summary',
    narration: 'And its summary of the five findings.',
    run: async ({ demo, page }) => {
      // The model sometimes files the summary as a slide instead; the take then shows it in the deck.
      const inDocument = (await page.locator(TAB('document')).count()) > 0;
      await demo.caption({
        value: 'Its summary of the five findings',
        subtitle: inDocument ? 'markdown skill' : 'filed by the agent as a slide in the deck',
      });
      await openTab({ demo, page }, inDocument ? 'document' : 'presentation');
      await demo.sleep({ ms: 4000 });
      await demo.clearCaption();
    },
  },
];
