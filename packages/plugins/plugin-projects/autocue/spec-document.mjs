//
// Copyright 2026 DXOS.org
//

/**
 * A spec starts as prose and takes structure a line at a time: `/feature` makes a line a feature embedded as its card,
 * the embed moves like any line, and deleting it deletes the feature until undo brings it back.
 *
 * @mdl packages/plugins/plugin-projects/PLUGIN.mdl test QA-7
 * @app storybook-react, narrowed to plugin-projects, on :9009
 *
 *   DX_STORIES=plugins/plugin-projects VITE_DX_DISABLE_ANIMATIONS=true moon run storybook-react:serve-nodeps
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --url http://localhost:9009 --out /tmp/demo
 */

const STORYBOOK = 'http://localhost:9009';
const SUBTITLE = 'from plugin-projects/PLUGIN.mdl QA-7';
const STORY = `${STORYBOOK}/iframe.html?id=plugins-plugin-projects-containers-specdocumentarticle--prose&viewMode=story`;

/** A beat for the viewer after a visible change. */
const BEAT = 1_500;

const CARD = '[data-testid="feature-embed"]';

const caption = (demo, step, text) =>
  demo.caption({ value: `Step ${step} — ${text}`, subtitle: SUBTITLE, position: 'top' });

/** The names on the cards, top to bottom. */
const cardNames = (page) =>
  page.$$eval(CARD, (cards) =>
    cards.map((card) => card.querySelector('[data-testid="feature-card"]')?.textContent ?? ''),
  );

const waitForCards = (page, count) =>
  page.waitForFunction(
    ([selector, expected]) => document.querySelectorAll(selector).length === expected,
    [CARD, count],
    {
      timeout: 15_000,
    },
  );

/** Selects the line that holds the named feature's embed; block widgets sit outside `.cm-line`, so through the view. */
const selectEmbedLine = (page, name) =>
  page.evaluate((name) => {
    const view = document.querySelector('.cm-content')?.cmTile?.root?.view;
    const text = view?.state.doc.toString() ?? '';
    const index = text.indexOf(`![${name}](`);
    if (!view || index === -1) {
      throw new Error(`no embed of ${name}`);
    }
    const line = view.state.doc.lineAt(index);
    view.focus();
    view.dispatch({ selection: { anchor: line.from, head: line.to } });
  }, name);

/** Types on a new line at the end of the document, then accepts `/feature` from the completion. */
const makeFeature = async (demo, page, name) => {
  await demo.click({ selector: '.cm-line:has-text("Later, maybe")', label: 'Document' });
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.press('Enter');
  await demo.keys({ key: `${name} /feature` });
  await page.keyboard.type(`${name} /feat`, { delay: 60 });
  await page.locator('.cm-tooltip-autocomplete').waitFor({ state: 'visible', timeout: 5_000 });
  await demo.sleep({ ms: 400 });
  await demo.press({ key: 'Enter' });
};

export const steps = [
  {
    name: 'Prep (off camera): warm the story',
    setup: true,
    run: async ({ page }) => {
      await page.goto(STORY);
      await page
        .locator('.cm-line:has-text("Mail should feel instant.")')
        .waitFor({ state: 'visible', timeout: 30_000 });
    },
  },
  {
    name: 'Open a spec written as prose',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Specs', subtitle: 'From prose to features, a line at a time' });
      await caption(demo, 1, 'Open the spec "Mail"');
      await waitForCards(page, 0);
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Make a line a feature',
    run: async ({ demo, page }) => {
      await caption(demo, 2, 'On a new line, type "Instant inbox /feature" and accept it');
      await makeFeature(demo, page, 'Instant inbox');
      await waitForCards(page, 1);
      await page.getByTestId('feature-companion').waitFor({ state: 'visible', timeout: 10_000 });
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Make another',
    run: async ({ demo, page }) => {
      await caption(demo, 3, 'On a new line, type "Search /feature" and accept it');
      await makeFeature(demo, page, 'Search');
      await waitForCards(page, 2);
      const names = await cardNames(page);
      if (!names[0].includes('Instant inbox') || !names[1].includes('Search')) {
        throw new Error(`cards out of order: ${names.join(', ')}`);
      }
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Reorder by moving the embed',
    run: async ({ demo, page }) => {
      await caption(demo, 4, 'With the cursor on the "Search" line, press Alt+Up');
      await demo.press({ key: 'Alt+ArrowUp' });
      await page.waitForFunction(
        (selector) => document.querySelector(selector)?.textContent?.includes('Search'),
        CARD,
        { timeout: 5_000 },
      );
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Delete a feature by deleting its embed',
    run: async ({ demo, page }) => {
      await caption(demo, 5, 'Select the "Instant inbox" line and press Delete');
      await demo.hover({ selector: `${CARD}:has-text("Instant inbox")`, label: 'Instant inbox' });
      await selectEmbedLine(page, 'Instant inbox');
      await demo.press({ key: 'Backspace' });
      await waitForCards(page, 1);
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Undo restores it',
    narration:
      'The spec is its document: features are ECHO objects embedded in the text, so people and agents edit the same spec.',
    run: async ({ demo, page }) => {
      await caption(demo, 6, 'Press Cmd+Z');
      await demo.press({ key: 'ControlOrMeta+z' });
      await waitForCards(page, 2);
      await demo.sleep({ ms: 6_000 });
    },
  },
];
