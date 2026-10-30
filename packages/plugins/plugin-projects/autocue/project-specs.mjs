//
// Copyright 2026 DXOS.org
//

/**
 * A project owns several specs: a feature map and a spec of prose sit side by side, the Overview has a form for each, and the
 * Specs tab shows one at a time, picked from a dropdown in its toolbar that also adds a spec. The toolbar follows the
 * tab, a spec offers the views its packages give, another plugin's package adds slash commands that write its blocks,
 * and the feature map's canvas adds a feature in the empty cell under the pointer.
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
const NEW_SPEC = 'Launch video';
const SCENE_TITLE = 'Open on a shared space';

const PICKER = '[data-testid="projectsPlugin.specPicker"]';
const DOCUMENT = '[data-testid="feature-map.document"]';
const ADD_ARTIFACT = '[data-testid="projectsPlugin.addArtifact"]';
const CANVAS_TOGGLE = '[data-testid="projectsPlugin.featureMap.canvas"]';
const EXTENSIONS = '[data-testid="projectsPlugin.specExtensions"]';
const EDITOR = `${DOCUMENT} .cm-content`;

const expectCount = async (page, selector, count, what) => {
  const seen = await page.locator(selector).count();
  if (seen !== count) {
    throw new Error(`expected ${count} ${what}, saw ${seen}`);
  }
};

/** Points at the empty cell left of the leftmost card, where the canvas then shows its `+`. */
const showAdd = async (page) => {
  const boxes = await page
    .locator('[data-testid="feature-canvas-node"]')
    .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON()));
  const { x, y, width, height } = boxes.reduce((left, box) => (box.x < left.x ? box : left));
  await page.mouse.move(x + width / 2 - width * 1.25, y + height / 2, { steps: 12 });
  await page.getByTestId('feature-canvas.add').waitFor({ state: 'visible', timeout: 5_000 });
};

const openExtensions = async (demo, page) => {
  await demo.click({ selector: EXTENSIONS, label: 'Extensions' });
  await page.getByRole('menu').waitFor({ state: 'visible', timeout: 5_000 });
};

const checkPackage = (demo, label) =>
  demo.click({ selector: `[role="menu"] >> [role="menuitemcheckbox"]:has-text("${label}")`, label });

const caption = (demo, step, text) => demo.caption({ value: `Step ${step} — ${text}`, subtitle: SUBTITLE, hold: READ });

/** Waits for the Specs tab to show the spec named `name`: the picker names it and its document is drawn. */
const waitForDocument = (page, name) =>
  page.waitForFunction(
    ([picker, editor, name]) =>
      document.querySelector(editor) !== null && document.querySelector(picker)?.textContent.includes(name),
    [PICKER, DOCUMENT, name],
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
      await caption(demo, 1, 'The Overview has a form for each spec the project owns');
      await expectCount(page, '[data-testid="projectsPlugin.specSummary"]', 2, 'spec forms');
      await expectCount(page, ADD_ARTIFACT, 1, 'Create artifact buttons');
      await demo.hover({ selector: '[data-testid="projectsPlugin.specSummary"] >> nth=0', label: MAP_SPEC });
      await demo.sleep({ ms: 1_500 });
      await demo.hover({ selector: '[data-testid="projectsPlugin.specSummary"] >> nth=1', label: TALK_SPEC });
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Open the Specs tab',
    run: async ({ demo, page }) => {
      await caption(demo, 2, 'The Specs tab opens on the first spec, with its own tools');
      await demo.click({ selector: '[data-testid="projectsPlugin.tab.spec"]', label: 'Specs' });
      await waitForDocument(page, MAP_SPEC);
      await page.locator('[data-testid="feature-embed"]').first().waitFor({ state: 'visible', timeout: 10_000 });
      await expectCount(page, ADD_ARTIFACT, 0, 'Create artifact buttons');
      await expectCount(page, CANVAS_TOGGLE, 1, 'view toggles');
      await expectCount(page, EXTENSIONS, 1, 'Extensions menus');
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
      await caption(demo, 4, `"${TALK_SPEC}" is prose, so it has no other views`);
      await demo.click({ selector: `[role="menu"] >> [role^="menuitem"]:has-text("${TALK_SPEC}")`, label: TALK_SPEC });
      await waitForDocument(page, TALK_SPEC);
      await expectCount(page, '[data-testid="feature-embed"]', 0, 'feature sections');
      await expectCount(page, CANVAS_TOGGLE, 0, 'view toggles');
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Give it the software package',
    run: async ({ demo, page }) => {
      await caption(demo, 5, 'Extensions lists the packages of dialects plugins contribute');
      await openExtensions(demo, page);
      await expectCount(page, '[role="menu"] >> [role="menuitemcheckbox"]', 2, 'packages');
      await demo.sleep({ ms: 1_500 });
      await checkPackage(demo, 'Software');
      await page.locator(CANVAS_TOGGLE).waitFor({ state: 'visible', timeout: 5_000 });
      await demo.press({ key: 'Escape' });
      await caption(demo, 5, 'With Software checked, the canvas and board views appear');
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Add a spec',
    done: async ({ page }) => (await page.locator(`${PICKER}:has-text("${NEW_SPEC}")`).count()) > 0,
    run: async ({ demo, page }) => {
      await caption(demo, 6, 'Add spec asks for a name');
      await openPicker(demo, page);
      await demo.click({ selector: '[role="menu"] >> [role^="menuitem"]:has-text("Add spec")', label: 'Add spec' });
      const name = page.getByLabel(/^name\*?$/i);
      await name.waitFor({ state: 'visible', timeout: 10_000 });
      await demo.click({ selector: '[data-testid="create-object-form"] >> input', label: 'Name' });
      await demo.keys({ key: NEW_SPEC });
      await page.keyboard.type(NEW_SPEC, { delay: 120 });
      await demo.click({ selector: '[data-testid="save-button"]', label: 'Create' });
      await waitForDocument(page, NEW_SPEC);
      await caption(demo, 6, `"${NEW_SPEC}" starts empty, its name the spec's own`);
      await openPicker(demo, page);
      await demo.sleep({ ms: LOOK });
      await demo.press({ key: 'Escape' });
    },
  },
  {
    name: 'Give it the video package',
    done: async ({ page }) => (await page.locator(`${EDITOR}:has-text("scene SC-1:")`).count()) > 0,
    run: async ({ demo, page }) => {
      await caption(demo, 7, "Video is another plugin's package: it adds no views");
      await openExtensions(demo, page);
      await checkPackage(demo, 'Video');
      await demo.press({ key: 'Escape' });
      await page.getByRole('menu').waitFor({ state: 'hidden', timeout: 5_000 });
      await expectCount(page, CANVAS_TOGGLE, 0, 'view toggles');
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Write a scene',
    done: async ({ page }) => (await page.locator(`${EDITOR}:has-text("scene SC-1:")`).count()) > 0,
    run: async ({ demo, page }) => {
      await caption(demo, 8, 'Its slash commands write each block of a video script');
      await demo.click({ selector: EDITOR, label: 'Document' });
      await page.keyboard.press('ControlOrMeta+End');
      await page.keyboard.press('Enter');
      await demo.keys({ key: '/scene' });
      await page.keyboard.type('/scene', { delay: 120 });
      await page.locator('.cm-tooltip-autocomplete').waitFor({ state: 'visible', timeout: 5_000 });
      await demo.sleep({ ms: 1_500 });
      await demo.press({ key: 'Enter' });
      await page.locator(`${EDITOR}:has-text("scene SC-1:")`).waitFor({ timeout: 5_000 });
      await demo.keys({ key: SCENE_TITLE });
      await page.keyboard.type(SCENE_TITLE, { delay: 60 });
      await caption(demo, 8, '/scene wrote a numbered scene, its fields ready to fill');
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Go back to the feature map',
    run: async ({ demo, page }) => {
      await caption(demo, 9, `Back on "${MAP_SPEC}", the canvas draws its features`);
      await pickSpec(demo, page, MAP_SPEC);
      await demo.click({ selector: CANVAS_TOGGLE, label: 'Canvas' });
      await page.getByTestId('feature-card').nth(7).waitFor({ state: 'visible', timeout: 10_000 });
      await expectCount(page, '[data-testid="feature-card"]', 8, 'feature cards');
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Add a feature on the canvas',
    done: async ({ page }) => (await page.getByTestId('feature-card').count()) > 8,
    run: async ({ demo, page }) => {
      await caption(demo, 10, 'Pointing at an empty cell shows a + that adds a feature there');
      await showAdd(page);
      await demo.click({ selector: '[data-testid="feature-canvas.add"]', label: 'Add a feature here' });
      await demo.click({ selector: '[data-testid="feature-map.new-feature"]', label: 'New feature' });
      await page.getByTestId('feature-card').nth(8).waitFor({ state: 'visible', timeout: 10_000 });
      await demo.clearCaption();
      await demo.sleep({ ms: 6_000 });
    },
  },
];
