//
// Copyright 2026 DXOS.org
//

/**
 * A project owns several specs: the Overview is one form in which each spec is a folded row that unfolds to its fields,
 * and whose + adds one. The Specs tab shows one spec at a time, picked from a dropdown in its toolbar: a feature map
 * whose prose and features sit together, where `/feature` turns a line of prose into a feature, and a spec of prose.
 * The toolbar follows the tab, a spec offers the views its packages give, another plugin's package adds slash
 * commands that write its blocks, and the feature map's canvas adds a feature in the empty cell under the pointer.
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
const MAP_DESCRIPTION = 'Mail, calendars and tasks in one place, with agents that take work off the list.';
const IDEA = 'A morning digest of what agents did overnight';
const IDEA_DESCRIPTION = 'Each morning, one note lists what agents closed, opened and are waiting on.';

const PICKER = '[data-testid="projectsPlugin.specPicker"]';
const DOCUMENT = '[data-testid="feature-map.document"]';
const ADD_ARTIFACT = '[data-testid="projectsPlugin.addArtifact"]';
const CANVAS_TOGGLE = '[data-testid="projectsPlugin.featureMap.canvas"]';
const EXTENSIONS = '[data-testid="projectsPlugin.specExtensions"]';
const EDITOR = `${DOCUMENT} .cm-content`;
// A listbox option's children are presentational to role selectors, so its rows are found by their legend.
const SPECS = '[role="listbox"][aria-label="Specs"]';
const row = (name) => `${SPECS} [role="group"]:has(> [data-part="legend"]:text-is("${name}"))`;
// A field's control: an input, or the editor of a markdown field, which its label does not name.
const field = (name, label) =>
  `${row(name)} [data-scope="field"][data-part="root"]:has(label:text-is("${label}")) :is(input, [contenteditable="true"])`;

const expectCount = async (page, selector, count, what) => {
  const seen = await page.locator(selector).count();
  if (seen !== count) {
    throw new Error(`expected ${count} ${what}, saw ${seen}`);
  }
};

/**
 * Points at the empty cell right of the top row's last card, where the canvas then shows its `+`. The top row keeps the
 * new card clear of the caption at the bottom of the frame.
 */
const showAdd = async (page) => {
  const boxes = await page
    .locator('[data-testid="feature-canvas-node"]')
    .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON()));
  const top = Math.min(...boxes.map((box) => box.y));
  const { x, y, width, height } = boxes
    .filter((box) => box.y - top < box.height / 2)
    .reduce((right, box) => (box.x > right.x ? box : right));
  await page.mouse.move(x + width / 2 + width * 1.25, y + height / 2, { steps: 12 });
  await page.getByTestId('feature-canvas.add').waitFor({ state: 'visible', timeout: 5_000 });
};

const openExtensions = async (demo, page) => {
  await demo.click({ selector: EXTENSIONS, label: 'Extensions' });
  await page.getByRole('menu').waitFor({ state: 'visible', timeout: 5_000 });
};

const checkPackage = (demo, label) =>
  demo.click({ selector: `[role="menu"] >> [role="menuitemcheckbox"]:has-text("${label}")`, label });

/** Scrolls the spec's document a notch at a time, so the camera can follow, until `selector` is up in view or the end. */
/** Whether a feature embed named `name` is drawn; its name is an input's value, not its text. */
const hasFeature = (page, name) =>
  page.evaluate(
    ([name]) =>
      [...document.querySelectorAll('[data-testid="feature-embed"] input')].some((input) => input.value === name),
    [name],
  );

const scrollDocumentTo = async (page, selector) => {
  const box = await page.locator(DOCUMENT).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const target = page.locator(selector);
  let last;
  for (let notch = 0; notch < 200; notch++) {
    const top = (await target.count()) > 0 ? (await target.first().boundingBox())?.y : undefined;
    if (top !== undefined && (top < box.y + box.height * 0.6 || top === last)) {
      return;
    }
    last = top;
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(100);
  }
  throw new Error(`never scrolled to ${selector}`);
};

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
      await page.locator(row(TALK_SPEC)).waitFor({ state: 'visible', timeout: 30_000 });
    },
  },
  {
    name: "See the project's specs",
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Specs', subtitle: 'A project owns several specs' });
      await caption(demo, 1, "The Overview is one form: each spec is a folded row in the project's");
      await expectCount(page, `${SPECS} [role="option"]`, 2, 'spec rows');
      await expectCount(page, ADD_ARTIFACT, 1, 'Create artifact buttons');
      await demo.hover({ selector: row(MAP_SPEC), label: MAP_SPEC });
      await demo.sleep({ ms: 1_500 });
      await demo.hover({ selector: row(TALK_SPEC), label: TALK_SPEC });
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Unfold a spec',
    run: async ({ demo, page }) => {
      await caption(demo, 2, 'Unfolded, a spec is its fields, nested in the form');
      await demo.click({ selector: `${row(MAP_SPEC)} >> button[aria-label="${MAP_SPEC}"]`, label: MAP_SPEC });
      const description = field(MAP_SPEC, 'Description');
      await page.locator(description).waitFor({ state: 'visible', timeout: 5_000 });
      await demo.click({ selector: description, label: 'Description' });
      await demo.keys({ key: MAP_DESCRIPTION });
      await page.keyboard.type(MAP_DESCRIPTION, { delay: 30 });
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Add a spec',
    done: async ({ page }) => (await page.locator(row(NEW_SPEC)).count()) > 0,
    run: async ({ demo, page }) => {
      await caption(demo, 3, 'The + beside Specs adds one, open for its name');
      await demo.click({ selector: '[data-testid="specs.add"]', label: 'Add spec' });
      const name = field('Untitled', 'Name');
      await page.locator(name).waitFor({ state: 'visible', timeout: 10_000 });
      await demo.click({ selector: name, label: 'Name' });
      await demo.keys({ key: NEW_SPEC });
      await page.keyboard.type(NEW_SPEC, { delay: 120 });
      await page.locator(row(NEW_SPEC)).waitFor({ state: 'visible', timeout: 5_000 });
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Open the Specs tab',
    run: async ({ demo, page }) => {
      await caption(demo, 4, "The Specs tab: the spec's prose, its features among it");
      await demo.click({ selector: '[data-testid="projectsPlugin.tab.spec"]', label: 'Specs' });
      await waitForDocument(page, MAP_SPEC);
      await page.locator('[data-testid="feature-embed"]').first().waitFor({ state: 'visible', timeout: 10_000 });
      await expectCount(page, ADD_ARTIFACT, 0, 'Create artifact buttons');
      await expectCount(page, CANVAS_TOGGLE, 1, 'view toggles');
      await expectCount(page, EXTENSIONS, 1, 'Extensions menus');
      await demo.sleep({ ms: LOOK });
      await scrollDocumentTo(page, `${EDITOR} .cm-line:has-text("${IDEA}")`);
      await demo.sleep({ ms: 1_500 });
    },
  },
  {
    name: 'Turn an idea into a feature',
    done: ({ page }) => hasFeature(page, IDEA),
    run: async ({ demo, page }) => {
      await caption(demo, 5, 'Under Ideas, /feature turns a line of prose into a feature');
      // The banner sits over the document's last lines.
      await demo.clearCaption();
      // The document's middle is an embedded feature's form, so the click goes to the idea's own line.
      await demo.click({ selector: `${EDITOR} .cm-line:has-text("${IDEA}")`, label: IDEA });
      await page.keyboard.press('End');
      await demo.keys({ key: ' /feature' });
      await page.keyboard.type(' /feature', { delay: 120 });
      await page.locator('.cm-tooltip-autocomplete').waitFor({ state: 'visible', timeout: 5_000 });
      await demo.sleep({ ms: 1_500 });
      await demo.press({ key: 'Enter' });
      await page.waitForFunction(
        ([name]) =>
          [...document.querySelectorAll('[data-testid="feature-embed"] input')].some((input) => input.value === name),
        [IDEA],
        { timeout: 5_000 },
      );
      await caption(demo, 5, 'The line is its name, and its description is next');
      await demo.keys({ key: IDEA_DESCRIPTION });
      await page.keyboard.type(IDEA_DESCRIPTION, { delay: 30 });
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'List the specs',
    run: async ({ demo, page }) => {
      await caption(demo, 6, 'The dropdown in the toolbar lists every spec');
      await openPicker(demo, page);
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Pick the other spec',
    run: async ({ demo, page }) => {
      await caption(demo, 7, `"${TALK_SPEC}" is prose, so it has no other views`);
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
      await caption(demo, 8, 'Extensions lists the packages of dialects plugins contribute');
      await openExtensions(demo, page);
      await expectCount(page, '[role="menu"] >> [role="menuitemcheckbox"]', 2, 'packages');
      await demo.sleep({ ms: 1_500 });
      await checkPackage(demo, 'Software');
      await page.locator(CANVAS_TOGGLE).waitFor({ state: 'visible', timeout: 5_000 });
      await demo.press({ key: 'Escape' });
      await caption(demo, 8, 'With Software checked, the canvas and board views appear');
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Give the new spec the video package',
    done: async ({ page }) => (await page.locator(`${EDITOR}:has-text("scene SC-1:")`).count()) > 0,
    run: async ({ demo, page }) => {
      await caption(demo, 9, `"${NEW_SPEC}" starts empty; Video is another plugin's package, with no views`);
      await pickSpec(demo, page, NEW_SPEC);
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
      await caption(demo, 10, 'Its slash commands write each block of a video script');
      await demo.click({ selector: EDITOR, label: 'Document' });
      await page.keyboard.press('ControlOrMeta+End');
      await demo.keys({ key: '/scene' });
      await page.keyboard.type('/scene', { delay: 120 });
      await page.locator('.cm-tooltip-autocomplete').waitFor({ state: 'visible', timeout: 5_000 });
      await demo.sleep({ ms: 1_500 });
      await demo.press({ key: 'Enter' });
      await page.locator(`${EDITOR}:has-text("scene SC-1:")`).waitFor({ timeout: 5_000 });
      await demo.keys({ key: SCENE_TITLE });
      await page.keyboard.type(SCENE_TITLE, { delay: 60 });
      await caption(demo, 10, '/scene wrote a numbered scene, its fields ready to fill');
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Go back to the feature map',
    run: async ({ demo, page }) => {
      await caption(demo, 11, `Back on "${MAP_SPEC}", the canvas draws its features, the new one too`);
      await pickSpec(demo, page, MAP_SPEC);
      await demo.click({ selector: CANVAS_TOGGLE, label: 'Canvas' });
      await page.getByTestId('feature-card').nth(8).waitFor({ state: 'visible', timeout: 10_000 });
      await expectCount(page, '[data-testid="feature-card"]', 9, 'feature cards');
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Add a feature on the canvas',
    done: async ({ page }) => (await page.getByTestId('feature-card').count()) > 9,
    run: async ({ demo, page }) => {
      await caption(demo, 12, 'Pointing at an empty cell shows a + that adds a feature there');
      await showAdd(page);
      await demo.click({ selector: '[data-testid="feature-canvas.add"]', label: 'Add a feature here' });
      await demo.click({ selector: '[data-testid="feature-map.new-feature"]', label: 'New feature' });
      await page.getByTestId('feature-card').nth(9).waitFor({ state: 'visible', timeout: 10_000 });
      await demo.clearCaption();
      await demo.sleep({ ms: 6_000 });
    },
  },
];
