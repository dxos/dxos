//
// Copyright 2026 DXOS.org
//

/**
 * Definitions in a spec's Structure companion, on the canvas: the spec's clusters, one cluster's features with the
 * blocks only each names, then one block with everything it touches, each opened by double-clicking its card. A script
 * in the video dialect draws the same way, in its own icons and colours.
 *
 * @mdl packages/plugins/plugin-code/PLUGIN.mdl test QA-7
 * @app composer-app via `moon run composer-app:serve -- --port 5180 --strictPort`
 *
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7336 --url http://localhost:5180 --out /tmp/demo
 *   node .agents/skills/autocue/scripts/trim-static.mjs --in /tmp/demo/session.webm --out spec-canvas.webm \
 *     --duration off --max-static 1 --caption-hold 2.5 --upload off
 */

import { readFileSync } from 'node:fs';

const SUBTITLE = 'from plugin-code/PLUGIN.mdl QA-7';
const PROJECT = 'Composer specs';
const CODE_SPEC = 'CodePlugin';
const VIDEO_SPEC = 'Launch video';

/** A spec's text without the front matter the spec's own fields replace. */
const body = (path) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/^---\n[\s\S]*?\n---\n+/, '');
const CODE_TEXT = body('../PLUGIN.mdl');
const VIDEO_TEXT = body('../../../reflect/deus/lang/examples/launch-video.mdl');

/** Time to read a caption before the gesture it describes. */
const READ = 2_500;

/** Time to look at what a gesture changed. */
const LOOK = 3_500;

const OVERVIEW = '[data-testid="projectsPlugin.tab.overview"]';
const COMPANION = '[data-testid="deck.companion"]';
const DOCUMENT = '[data-testid="projectsPlugin.spec.document"]';
const EDITOR = `${DOCUMENT} .cm-content`;
const EXTENSIONS = '[data-testid="projectsPlugin.specExtensions"]';
const PICKER = '[data-testid="projectsPlugin.specPicker"]';
const SPECS = '[role="listbox"][aria-label="Specs"]';
const STRUCTURE = '[data-testid="deck.companion.tab.spec-structure"]';
const GRAPH = `${COMPANION} [data-testid="definition-graph"]`;
const CLUSTER = `${COMPANION} [data-testid="definition-canvas.cluster"]`;
const TRAIL_SPEC = `${COMPANION} [data-testid="breadcrumb-root"]`;
const row = (name) => `${SPECS} [role="group"]:has(> [data-part="legend"]:text-is("${name}"))`;
const field = (name, label) =>
  `${row(name)} [data-scope="field"][data-part="root"]:has(label:text-is("${label}")) :is(input, [contenteditable="true"])`;
const layout = (id) => `${COMPANION} [data-testid="definition-graph.layout.${id}"]`;
const cluster = (hub) => `${COMPANION} [data-cluster="cluster:${hub}"]`;
const card = (id) => `${COMPANION} [data-testid="definition-canvas.card"][data-definition="${id}"]`;

const caption = (demo, step, text) => demo.caption({ value: `Step ${step} — ${text}`, subtitle: SUBTITLE, hold: READ });

/** Whether the Specs tab's editor holds any of `marks`; it draws only the lines in view, so the first few will do. */
const hasText = async (page, marks) =>
  (await page.locator(`${EDITOR}:is(${marks.map((mark) => `:has-text("${mark}")`).join(', ')})`).count()) > 0;

/** Waits for the Specs tab to show the spec named `name`. */
const waitForSpec = (page, name) =>
  page.waitForFunction(
    ([picker, editor, name]) =>
      document.querySelector(editor) !== null && document.querySelector(picker)?.textContent.includes(name),
    [PICKER, EDITOR, name],
    { timeout: 15_000 },
  );

const pickSpec = async (page, name, demo) => {
  const click = (selector, label) => (demo ? demo.click({ selector, label }) : page.locator(selector).first().click());
  await click(PICKER, 'Spec dropdown');
  await page.getByRole('menu').waitFor({ state: 'visible', timeout: 5_000 });
  await click(`[role="menu"] >> [role^="menuitem"]:has-text("${name}")`, name);
  await waitForSpec(page, name);
};

const addSpec = async (page, name) => {
  await page.locator(OVERVIEW).first().click();
  if ((await page.locator(row(name)).count()) > 0) {
    return;
  }
  await page.locator('[data-testid="specs.add"]').first().click();
  const input = page.locator(field('Untitled', 'Name')).first();
  await input.waitFor({ state: 'visible', timeout: 10_000 });
  await input.click();
  await page.keyboard.type(name);
  await page.locator(row(name)).first().waitFor({ state: 'visible', timeout: 10_000 });
};

const writeSpec = async (page, name, text, marks) => {
  await page.locator('[data-testid="projectsPlugin.tab.spec"]').first().click();
  await pickSpec(page, name);
  await page.locator(EDITOR).first().click();
  await page.evaluate(
    ([selector, text]) => {
      const data = new DataTransfer();
      data.setData('text/plain', text);
      document
        .querySelector(selector)
        .dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    },
    [EDITOR, text],
  );
  await page.keyboard.press('ControlOrMeta+Home');
  if (!(await hasText(page, marks))) {
    throw new Error(`the paste left "${name}" empty`);
  }
};

/** A navigation tree item's label; the item itself has no box of its own. */
const treeItem = (page, name) => page.locator('[role="treeitem"]').getByText(name, { exact: true }).first();

/** Whether the navigation sidebar is open; closed, it slides off the left edge rather than hiding. */
const sidebarOpen = async (page) => ((await treeItem(page, 'Home').boundingBox())?.x ?? -1) > 0;

const toggleSidebar = (page) => page.keyboard.press('ControlOrMeta+Quote');

/** Points at a card, then double-clicks it, which the canvas reads as opening its level. */
const open = async (demo, page, selector, label) => {
  await demo.hover({ selector, label });
  await page.waitForTimeout(800);
  await page.locator(selector).first().dblclick();
};

const CODE_MARKS = ['plugin CodePlugin', 'decision D-'];
const VIDEO_MARKS = ['character maya', 'A 45-second launch video'];

export const steps = [
  {
    name: 'Prep (off camera): dismiss notices, enable Code',
    setup: true,
    run: async ({ page }) => {
      await page.evaluate(() =>
        composer.invoke('org.dxos.operation.registry.enablePlugins', { ids: ['org.dxos.plugin.code'] }),
      );
      await page.waitForFunction(
        () => composer.plugins().some((plugin) => plugin.id === 'org.dxos.plugin.code' && plugin.active),
        undefined,
        { timeout: 30_000 },
      );
      const notice = page.locator(
        '[data-testid="org.dxos.plugin.observability.notice"] button:not(:has-text("Settings"))',
      );
      if (
        await notice
          .first()
          .waitFor({ state: 'visible', timeout: 8_000 })
          .then(
            () => true,
            () => false,
          )
      ) {
        await notice.first().click();
      }
    },
  },
  {
    name: 'Prep (off camera): create the project',
    setup: true,
    done: async ({ page }) => (await page.locator(OVERVIEW).count()) > 0,
    run: async ({ page }) => {
      if ((await page.locator(OVERVIEW).count()) > 0) {
        return;
      }
      if (!(await sidebarOpen(page))) {
        await toggleSidebar(page);
      }
      const item = treeItem(page, PROJECT);
      if ((await item.count()) > 0) {
        await item.click();
        await page.locator(OVERVIEW).first().waitFor({ timeout: 30_000 });
        return;
      }
      await page.locator('[data-testid="spacePlugin.createObject"]').first().click();
      await page.locator('[data-testid="create-object-form.type.org.dxos.type.project"]').click();
      await page.locator('[data-testid="create-project-panel.name-input"]').fill(PROJECT);
      await page.locator('[role="option"][data-value="org.dxos.project.default"]').click();
      await page.locator('[role="dialog"] [data-testid="save-button"]').click();
      await page.locator(OVERVIEW).first().waitFor({ timeout: 30_000 });
    },
  },
  {
    name: 'Prep (off camera): add the specs',
    setup: true,
    done: async ({ page }) => (await page.locator(row(VIDEO_SPEC)).count()) > 0,
    run: async ({ page }) => {
      await addSpec(page, CODE_SPEC);
      await addSpec(page, VIDEO_SPEC);
    },
  },
  {
    name: "Prep (off camera): write plugin-code's spec",
    setup: true,
    run: async ({ page }) => {
      await page.locator('[data-testid="projectsPlugin.tab.spec"]').first().click();
      await pickSpec(page, CODE_SPEC);
      if (!(await hasText(page, CODE_MARKS))) {
        await writeSpec(page, CODE_SPEC, CODE_TEXT, CODE_MARKS);
      }
    },
  },
  {
    name: 'Prep (off camera): write the launch video in the video dialect',
    setup: true,
    run: async ({ page }) => {
      await pickSpec(page, VIDEO_SPEC);
      if (!(await hasText(page, VIDEO_MARKS))) {
        await writeSpec(page, VIDEO_SPEC, VIDEO_TEXT, VIDEO_MARKS);
      }
      await page.locator(EXTENSIONS).first().click();
      const video = page.locator('[role="menu"] >> [role="menuitemcheckbox"]:has-text("Video")');
      await video.waitFor({ state: 'visible', timeout: 5_000 });
      if ((await video.getAttribute('aria-checked')) !== 'true') {
        await video.click();
      }
      await page.keyboard.press('Escape');
    },
  },
  {
    name: "Prep (off camera): show plugin-code's spec",
    setup: true,
    run: async ({ page }) => {
      const close = page.locator('[data-testid="plankHeading.closeCompanion"]').first();
      if (await close.isVisible().catch(() => false)) {
        await close.click();
      }
      // The canvas needs room: no sidebar, and a companion wider than its default.
      if (await sidebarOpen(page)) {
        await toggleSidebar(page);
        await page.waitForTimeout(1_000);
        if (await sidebarOpen(page)) {
          throw new Error('the sidebar did not close');
        }
      }
      await page.evaluate(() =>
        composer.invoke('org.dxos.operation.deck.updatePlankSize', { id: 'companion', size: 62 }),
      );
      await pickSpec(page, CODE_SPEC);
      await page.locator(EDITOR).first().click();
      await page.keyboard.press('ControlOrMeta+Home');
      await page.waitForTimeout(2_000);
    },
  },
  {
    name: 'Open the Structure companion',
    narration: 'Definitions groups a spec by what names its blocks.',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Definitions on a canvas', subtitle: 'A spec drawn from its dialects' });
      await caption(demo, 1, "Structure groups a spec's blocks by what names them");
      await demo.click({ selector: '[data-testid="plankHeading.companion"] >> nth=0', label: 'Companion' });
      await page.locator(STRUCTURE).waitFor({ state: 'visible', timeout: 10_000 });
      if (!page.url().endsWith('/companion/spec-structure')) {
        await demo.click({ selector: STRUCTURE, label: 'Structure' });
      }
      await page.locator(layout('canvas')).waitFor({ state: 'visible', timeout: 15_000 });
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Switch to the canvas',
    narration: 'On the canvas, each cluster is a card, gathered around the block its features share.',
    run: async ({ demo, page }) => {
      await caption(demo, 2, 'Canvas: a card per cluster of features');
      await demo.click({ selector: layout('canvas'), label: 'Canvas' });
      await page.locator(cluster('CoderSkill')).waitFor({ state: 'visible', timeout: 20_000 });
      await demo.sleep({ ms: LOOK + 1_000 });
    },
  },
  {
    name: 'Open a cluster',
    narration: 'Double-clicking a cluster zooms into it: a frame per feature, holding what only it names.',
    run: async ({ demo, page }) => {
      await caption(demo, 3, 'Double-click a cluster to open its features');
      await open(demo, page, cluster('CoderSkill'), 'CoderSkill');
      await page.locator(CLUSTER).first().waitFor({ state: 'detached', timeout: 15_000 });
      await page.locator(`${card('F-8')}[data-opens]`).waitFor({ state: 'visible', timeout: 30_000 });
      await caption(demo, 3, "Each block wears its dialect's icon and colour");
      await demo.sleep({ ms: LOOK + 1_000 });
    },
  },
  {
    name: 'Open a block',
    narration: 'A block opens onto everything it touches, each link drawn with its relationship.',
    run: async ({ demo, page }) => {
      await caption(demo, 4, 'Double-click a feature: everything it touches');
      await open(demo, page, card('F-8'), 'F-8');
      await page
        .locator(`${COMPANION} [data-testid="definition-canvas.card"][data-focused]`)
        .waitFor({ state: 'visible', timeout: 15_000 });
      await demo.sleep({ ms: LOOK });
      await caption(demo, 4, 'Dashed arrows are its uses: needed, not owned');
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Back to the whole spec',
    narration: "The canvas's trail goes back up a level at a time.",
    run: async ({ demo, page }) => {
      await caption(demo, 5, 'The trail goes back to the whole spec');
      await demo.click({ selector: TRAIL_SPEC, label: 'All groups' });
      await page.locator(cluster('CoderSkill')).waitFor({ state: 'visible', timeout: 15_000 });
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Open the launch video',
    narration: 'A script in the video dialect groups by the same rules: scenes gather around the cast they share.',
    run: async ({ demo, page }) => {
      await caption(demo, 6, 'A video script groups by the same rules');
      await pickSpec(page, VIDEO_SPEC, demo);
      await page.locator(layout('canvas')).waitFor({ state: 'visible', timeout: 15_000 });
      if ((await page.locator(CLUSTER).count()) === 0) {
        await demo.click({ selector: layout('canvas'), label: 'Canvas' });
      }
      await page.locator(cluster('maya')).waitFor({ state: 'visible', timeout: 20_000 });
      await demo.sleep({ ms: LOOK + 1_000 });
    },
  },
  {
    name: "Open a character's cluster",
    narration: 'Each scene composes its shots, voiceover and captions, drawn as filled diamonds.',
    run: async ({ demo, page }) => {
      await caption(demo, 7, 'Each scene composes its shots and voiceover');
      await open(demo, page, cluster('maya'), 'Maya');
      await page.locator(CLUSTER).first().waitFor({ state: 'detached', timeout: 15_000 });
      await demo.sleep({ ms: LOOK + 2_000 });
      await demo.clearCaption();
      await demo.sleep({ ms: 4_000 });
    },
  },
];
