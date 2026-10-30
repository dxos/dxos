//
// Copyright 2026 DXOS.org
//

/**
 * A spec starts as prose and takes structure a paragraph at a time: `/feature` at the end of a paragraph makes it the
 * description of a new feature, drawn in place as the feature's editable section. The section moves like a line, and
 * Backspace deletes it, and its feature, until undo brings both back. A section also lists the features its feature
 * depends on, and adds one.
 *
 * @mdl packages/plugins/plugin-projects/PLUGIN.mdl test QA-7
 * @app storybook-react, narrowed to plugin-projects, on :9009
 *
 *   DX_STORIES=plugins/plugin-projects VITE_DX_DISABLE_ANIMATIONS=true moon run storybook-react:serve-nodeps
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --out /tmp/demo \
 *     --url 'http://localhost:9009/iframe.html?id=plugins-plugin-projects-containers-specdocumentarticle--prose&viewMode=story'
 *   node .agents/skills/autocue/scripts/trim-static.mjs --in /tmp/demo/demo.webm --out /tmp/demo/demo-trimmed.webm \
 *     --duration off --max-static 3 --caption-hold 4
 */

const STORYBOOK = 'http://localhost:9009';
const SUBTITLE = 'from plugin-projects/PLUGIN.mdl QA-7';
const STORY = `${STORYBOOK}/iframe.html?id=plugins-plugin-projects-containers-specdocumentarticle--prose&viewMode=story`;

/** Time to read a caption before the gesture it describes. */
const READ = 3_000;

/** Time to look at what a gesture changed. */
const LOOK = 3_000;

const SECTION = '[data-testid="feature-embed"]';

const caption = (demo, step, text) => demo.caption({ value: `Step ${step} — ${text}`, subtitle: SUBTITLE, hold: READ });

const waitForNames = (page, expected) =>
  page.waitForFunction(
    ([selector, expected]) =>
      JSON.stringify(
        [...document.querySelectorAll(`${selector} input[data-testid="name"]`)].map((input) => input.value),
      ) === JSON.stringify(expected),
    [SECTION, expected],
    { timeout: 10_000 },
  );

/** Puts the cursor at the end of a paragraph, types `/feature` after it and accepts the completion. */
const makeFeature = async (demo, page, paragraph) => {
  await demo.click({ selector: `.cm-line:has-text("${paragraph}")`, label: 'End of the paragraph' });
  await demo.press({ key: 'End' });
  await demo.keys({ key: '/feature' });
  await page.keyboard.type(' /feature', { delay: 140 });
  await page.locator('.cm-tooltip-autocomplete').waitFor({ state: 'visible', timeout: 5_000 });
  await demo.sleep({ ms: 1_200 });
  await demo.press({ key: 'Enter' });
  await page.waitForFunction(() => document.activeElement?.getAttribute('data-testid') === 'name', undefined, {
    timeout: 10_000,
  });
};

/** Types the new feature's name into its focused name field, then returns to the text. */
const nameFeature = async (demo, page, name) => {
  await demo.keys({ key: name });
  await page.keyboard.type(name, { delay: 140 });
  await demo.sleep({ ms: 1_500 });
  await demo.press({ key: 'Escape' });
  await page.waitForFunction(() => document.activeElement?.classList.contains('cm-content'), undefined, {
    timeout: 5_000,
  });
};

export const steps = [
  {
    name: 'Prep (off camera): load the story',
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
      await demo.title({ value: 'Specs', subtitle: 'From prose to features, one paragraph at a time' });
      await caption(demo, 1, '"Mail" is three paragraphs of prose, with no structure yet');
      if ((await page.locator(SECTION).count()) !== 0) {
        throw new Error('the spec already holds features');
      }
      await demo.hover({ selector: '.cm-line:has-text("Mail should feel instant.")', label: 'Prose' });
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Turn a paragraph into a feature',
    run: async ({ demo, page }) => {
      await caption(demo, 2, 'At the end of a paragraph, type /feature and press Enter');
      await makeFeature(demo, page, 'Search finds any message');
      await caption(demo, 2, 'The paragraph is now a feature, as its description');
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Name it',
    run: async ({ demo, page }) => {
      await caption(demo, 3, 'Type its name, then press Escape to go back to the text');
      await nameFeature(demo, page, 'Search');
      await waitForNames(page, ['Search']);
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Turn another paragraph into a feature',
    run: async ({ demo, page }) => {
      await caption(demo, 4, 'The same for the first paragraph: "Instant inbox"');
      await makeFeature(demo, page, 'Mail should feel instant.');
      await nameFeature(demo, page, 'Instant inbox');
      await waitForNames(page, ['Instant inbox', 'Search']);
      await caption(demo, 4, 'Two features; the last paragraph is still prose');
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Reorder by moving the embed',
    run: async ({ demo, page }) => {
      await caption(demo, 5, 'A feature moves like a line: press Alt+Down twice');
      await demo.press({ key: 'Alt+ArrowDown' });
      await demo.sleep({ ms: 1_000 });
      await demo.press({ key: 'Alt+ArrowDown' });
      await waitForNames(page, ['Search', 'Instant inbox']);
      await caption(demo, 5, "The spec's features follow the text: Search is first");
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Delete a feature by deleting its embed',
    run: async ({ demo, page }) => {
      await caption(demo, 6, 'With the cursor after "Instant inbox", press Backspace');
      await demo.press({ key: 'Backspace' });
      await waitForNames(page, ['Search']);
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Undo restores it',
    narration:
      'The spec is its document: features are ECHO objects embedded in the text, so people and agents edit the same spec.',
    run: async ({ demo, page }) => {
      await caption(demo, 7, 'Cmd+Z brings back the same feature, description and all');
      await demo.press({ key: 'ControlOrMeta+z' });
      await waitForNames(page, ['Search', 'Instant inbox']);
      await demo.caption({ value: 'Each feature is an ECHO object, embedded in the text', subtitle: SUBTITLE });
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Depend on another feature',
    run: async ({ demo, page }) => {
      // After the undo, "Instant inbox" is the second section.
      const section = `${SECTION} >> nth=1`;
      await caption(demo, 8, 'A section also holds what its feature depends on');
      await demo.click({ selector: section, label: 'Instant inbox' });
      await demo.click({
        selector: `${section} >> [data-testid="feature-section.add-dependency"]`,
        label: 'Add dependency',
      });
      await page.keyboard.type('Search', { delay: 140 });
      await demo.click({ selector: '[role="option"]:has-text("Search")', label: 'Search' });
      await page
        .locator(`${section} >> [data-testid="feature-section.dependencies"]:has-text("Search")`)
        .waitFor({ state: 'visible', timeout: 5_000 });
      // The document ends here, so the row cannot scroll above the caption banner; clear it instead.
      await demo.clearCaption();
      await demo.sleep({ ms: 6_000 });
    },
  },
];
