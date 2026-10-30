//
// Copyright 2026 DXOS.org
//

/**
 * A project owns several specs: a feature map and a spec of prose sit side by side, the Overview sums up each, and the
 * Specs tab shows one at a time, picked from a dropdown in its toolbar that also adds a spec. The feature map's canvas
 * still draws the features its spec holds.
 *
 * @mdl packages/plugins/plugin-projects/PLUGIN.mdl test QA-8
 * @app storybook-react, narrowed to plugin-projects, on :9009
 *
 *   DX_STORIES=plugins/plugin-projects VITE_DX_DISABLE_ANIMATIONS=true moon run storybook-react:serve-nodeps
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --out /tmp/demo \
 *     --url 'http://localhost:9009/iframe.html?id=plugins-plugin-projects-containers-projectarticle--default&viewMode=story'
 *   node .agents/skills/autocue/scripts/trim-static.mjs --in /tmp/demo/session.webm --out /tmp/demo/project-specs.webm \
 *     --max-static 3 --upload off
 */

const STORYBOOK = 'http://localhost:9009';
const SUBTITLE = 'from plugin-projects/PLUGIN.mdl QA-8';
const STORY = `${STORYBOOK}/iframe.html?id=plugins-plugin-projects-containers-projectarticle--default&viewMode=story`;

/** Time to read a caption before the gesture it describes. */
const READ = 3_000;

/** Time to look at what a gesture changed. */
const LOOK = 3_000;

const MAP_SPEC = 'Inbox and agents';
const TALK_SPEC = 'Launch talk';
const NEW_SPEC = 'Release notes';

const PICKER = '[data-testid="projectsPlugin.specPicker"]';
const DOCUMENT = '[data-testid="feature-map.document"]';

const caption = (demo, step, text) => demo.caption({ value: `Step ${step} — ${text}`, subtitle: SUBTITLE, hold: READ });

const waitForDocument = (page, name) =>
  page.waitForFunction(
    ([selector, name]) => document.querySelector(selector)?.textContent.includes(`name: ${name}`),
    [DOCUMENT, name],
    { timeout: 10_000 },
  );

const openPicker = async (demo, page) => {
  await demo.click({ selector: PICKER, label: 'Spec dropdown' });
  await page.getByRole('menu').waitFor({ state: 'visible', timeout: 5_000 });
};

const pickSpec = async (demo, page, name) => {
  await openPicker(demo, page);
  await demo.click({ selector: `[role="menu"] >> [role^="menuitem"]:has-text("${name}")`, label: name });
  await waitForDocument(page, name);
};

export const steps = [
  {
    name: 'Prep (off camera): load the story',
    setup: true,
    run: async ({ page }) => {
      await page.goto(STORY);
      await page.getByTestId('projectsPlugin.specSummary').nth(1).waitFor({ state: 'visible', timeout: 30_000 });
    },
  },
  {
    name: "See the project's specs",
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Specs', subtitle: 'A project owns several specs' });
      await caption(demo, 1, 'The Overview sums up each spec the project owns');
      const summaries = page.getByTestId('projectsPlugin.specSummary');
      if ((await summaries.count()) !== 2) {
        throw new Error('expected two spec summaries');
      }
      await demo.hover({ selector: '[data-testid="projectsPlugin.specSummary"] >> nth=0', label: MAP_SPEC });
      await demo.sleep({ ms: 1_500 });
      await demo.hover({ selector: '[data-testid="projectsPlugin.specSummary"] >> nth=1', label: TALK_SPEC });
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Open the Specs tab',
    run: async ({ demo, page }) => {
      await caption(demo, 2, 'The Specs tab opens on the first spec, a feature map');
      await demo.click({ selector: '[data-testid="projectsPlugin.tab.spec"]', label: 'Specs' });
      await waitForDocument(page, MAP_SPEC);
      await page.locator('[data-testid="feature-embed"]').first().waitFor({ state: 'visible', timeout: 10_000 });
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'List the specs',
    run: async ({ demo, page }) => {
      await caption(demo, 3, 'The dropdown in the toolbar lists every spec');
      await openPicker(demo, page);
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Pick the other spec',
    run: async ({ demo, page }) => {
      await caption(demo, 4, `"${TALK_SPEC}" is prose, with no features`);
      await demo.click({ selector: `[role="menu"] >> [role^="menuitem"]:has-text("${TALK_SPEC}")`, label: TALK_SPEC });
      await waitForDocument(page, TALK_SPEC);
      if ((await page.locator('[data-testid="feature-embed"]').count()) !== 0) {
        throw new Error(`"${TALK_SPEC}" shows feature sections`);
      }
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Add a spec',
    done: async ({ page }) => (await page.locator(`${PICKER}:has-text("${NEW_SPEC}")`).count()) > 0,
    run: async ({ demo, page }) => {
      await caption(demo, 5, 'Add spec asks for a name');
      await openPicker(demo, page);
      await demo.click({ selector: '[role="menu"] >> [role^="menuitem"]:has-text("Add spec")', label: 'Add spec' });
      const name = page.getByLabel(/^name\*?$/i);
      await name.waitFor({ state: 'visible', timeout: 10_000 });
      await demo.click({ selector: '[data-testid="create-object-form"] >> input', label: 'Name' });
      await demo.keys({ key: NEW_SPEC });
      await page.keyboard.type(NEW_SPEC, { delay: 120 });
      await demo.click({ selector: '[data-testid="save-button"]', label: 'Create' });
      await waitForDocument(page, NEW_SPEC);
      await caption(demo, 5, `"${NEW_SPEC}" starts as its name alone`);
      await openPicker(demo, page);
      await demo.sleep({ ms: LOOK });
      await demo.press({ key: 'Escape' });
    },
  },
  {
    name: 'Go back to the feature map',
    run: async ({ demo, page }) => {
      await caption(demo, 6, `Back on "${MAP_SPEC}", the canvas draws its features`);
      await pickSpec(demo, page, MAP_SPEC);
      await demo.click({ selector: '[data-testid="projectsPlugin.featureMap.canvas"]', label: 'Canvas' });
      await page.getByTestId('feature-card').nth(7).waitFor({ state: 'visible', timeout: 10_000 });
      const cards = await page.getByTestId('feature-card').count();
      if (cards !== 8) {
        throw new Error(`expected eight feature cards, saw ${cards}`);
      }
      await demo.clearCaption();
      await demo.sleep({ ms: 6_000 });
    },
  },
];
