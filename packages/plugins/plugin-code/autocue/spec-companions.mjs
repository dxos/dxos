//
// Copyright 2026 DXOS.org
//

/**
 * Every view of a spec's companion tabs, in order: Structure's Definitions and Related, with Related following the
 * editor's cursor, then the software dialect's Data model, API and Board; Decisions at the cursor and the Ledger, a
 * level at a time; Review, and the software dialect's Code. A script in the video dialect then offers only the views
 * that read any dialect, and Definitions drills into it as it does into code.
 *
 * @mdl packages/plugins/plugin-code/PLUGIN.mdl test QA-8
 * @app composer-app via `moon run composer-app:serve -- --port 5180 --strictPort`
 *
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7336 --url http://localhost:5180 --out /tmp/demo
 *   node .agents/skills/autocue/scripts/trim-static.mjs --in /tmp/demo/session.webm --out spec-companions.webm \
 *     --duration off --max-static 1 --caption-hold 2.5 --upload off
 */

import { readFileSync } from 'node:fs';

const SUBTITLE = 'from plugin-code/PLUGIN.mdl QA-8';
const PROJECT = 'Composer specs';
const CODE_SPEC = 'CodePlugin';
const VIDEO_SPEC = 'Launch video';

/** Features of plugin-code's map, one or more per status, for the Board to sort. */
const BOARD_FEATURES = [
  ['Two-way spec sync', 'operational'],
  ['Diff mode', 'operational'],
  ['Spec questions', 'prototype'],
  ["A project's repositories", 'prototype'],
  ['Local build & run', 'failing'],
  ['Spec reviews in ECHO', 'planned'],
];

/** A spec's text without the front matter the spec's own fields replace. */
const body = (path) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/^---\n[\s\S]*?\n---\n+/, '');
const CODE_TEXT = body('../PLUGIN.mdl');
const VIDEO_TEXT = body('../../../reflect/deus/lang/examples/launch-video.mdl');
const REVIEW_TEXT = readFileSync(
  new URL('../src/containers/SpecArticle/__fixtures__/plugin-code.review-2026-10-27.mdl', import.meta.url),
  'utf8',
);

/** Time to read a caption before the gesture it describes. */
const READ = 2_500;

/** Time to look at what a gesture changed. */
const LOOK = 3_500;

const OVERVIEW = '[data-testid="projectsPlugin.tab.overview"]';
const COMPANION = '[data-testid="deck.companion"]';
const EXTENSIONS = '[data-testid="projectsPlugin.specExtensions"]';
const DOCUMENT = '[data-testid="projectsPlugin.spec.document"]';
const EDITOR = `${DOCUMENT} .cm-content`;
const PICKER = '[data-testid="projectsPlugin.specPicker"]';
const SPECS = '[role="listbox"][aria-label="Specs"]';
const tab = (group) => `[data-testid="deck.companion.tab.spec-${group}"]`;
const view = (id) => `${COMPANION} [data-testid="spec-companion.view.${id}"]`;
const RELATED = `${COMPANION} [data-testid="definition-related.focus"]`;
const LEDGER_BLOCK = '[data-testid="decision-ledger.block"]';
const LEDGER_THREAD = '[data-testid="decision-ledger.thread"]';
const line = (text) => `${EDITOR} .cm-line:has-text("${text}")`;
/**
 * A block's id in its header line, clear of the chips floated at the line's end; a dialect's header the editor does
 * not highlight is the line itself.
 */
const blockId = async (page, text, id) => {
  const span = `${line(text)} .cm-mdl-block-id:text-is("${id}")`;
  return (await page.locator(span).count()) > 0 ? span : line(text);
};
const CLUSTER = `${COMPANION} [data-testid="definition-canvas.cluster"]`;
const row = (name) => `${SPECS} [role="group"]:has(> [data-part="legend"]:text-is("${name}"))`;
const field = (name, label) =>
  `${row(name)} [data-scope="field"][data-part="root"]:has(label:text-is("${label}")) :is(input, [contenteditable="true"])`;
const cluster = (hub) => `${COMPANION} [data-cluster="cluster:${hub}"]`;
const card = (id) => `${COMPANION} [data-testid="definition-canvas.card"][data-definition="${id}"]`;

const caption = (demo, step, text) => demo.caption({ value: `Step ${step} — ${text}`, subtitle: SUBTITLE, hold: READ });

/** Opens a companion tab, unless it is the one open. */
const openTab = async (demo, page, group, label) => {
  await page.locator(tab(group)).waitFor({ state: 'visible', timeout: 10_000 });
  if (!page.url().endsWith(`/companion/spec-${group}`)) {
    await demo.click({ selector: tab(group), label });
  }
};

/** Picks a view in the open tab's toolbar and waits for it to draw `ready`. */
const openView = async (demo, page, id, label, ready) => {
  await demo.click({ selector: view(id), label });
  await page.locator(`${COMPANION} ${ready}`).first().waitFor({ state: 'visible', timeout: 15_000 });
};

/** Waits for Related to centre on `id`. */
const waitForRelated = (page, id) =>
  page.locator(`${RELATED}[data-definition="${id}"]`).waitFor({ state: 'visible', timeout: 10_000 });

/**
 * Scrolls the editor down (or up, with `direction` -1) until the line holding `text` is drawn, then centres it; the
 * editor draws only the lines in view.
 */
const scrollToLine = async (page, text, direction = 1) => {
  for (let tries = 0; tries < 200 && (await page.locator(line(text)).count()) === 0; tries++) {
    await page.evaluate(
      ([editor, direction]) => {
        let scroller = document.querySelector(editor);
        while (scroller && scroller.scrollHeight <= scroller.clientHeight) {
          scroller = scroller.parentElement;
        }
        scroller?.scrollBy({ top: direction * scroller.clientHeight * 0.8 });
      },
      [EDITOR, direction],
    );
    await page.waitForTimeout(50);
  }
  await page
    .locator(line(text))
    .first()
    .evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  await page.waitForTimeout(800);
};

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

/** Turns on the open spec's package `label` from the packages menu, unless it is on. */
const usePackage = async (page, label) => {
  await page.locator(EXTENSIONS).first().click();
  const item = page.locator(`[role="menu"] >> [role="menuitemcheckbox"]:has-text("${label}")`);
  await item.waitFor({ state: 'visible', timeout: 5_000 });
  if ((await item.getAttribute('aria-checked')) !== 'true') {
    await item.click();
  }
  await page.keyboard.press('Escape');
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
    name: 'Prep (off camera): dismiss notices, enable Code and Video',
    setup: true,
    run: async ({ page }) => {
      await page.evaluate(() =>
        composer.invoke('org.dxos.operation.registry.enablePlugins', {
          ids: ['org.dxos.plugin.code', 'org.dxos.plugin.video'],
        }),
      );
      await page.waitForFunction(
        () =>
          ['org.dxos.plugin.code', 'org.dxos.plugin.video'].every((id) =>
            composer.plugins().some((plugin) => plugin.id === id && plugin.active),
          ),
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
      await usePackage(page, 'Software');
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
      await usePackage(page, 'Video');
    },
  },
  {
    name: "Prep (off camera): record a review of plugin-code's spec",
    setup: true,
    run: async ({ page }) => {
      // The debug port's `invoke` takes only a live Ref, so it comes from the open project's `specs` in the app graph.
      await page.evaluate(
        async ([name, content]) => {
          const project = composer.graph._model
            .filterNodes(() => true)
            .find(({ id }) => /\/org\.dxos\.type\.project\/[^/]+$/.test(id)).data.data;
          const spec = project.specs.find((ref) => ref.target?.name === name) ?? project.specs[0];
          const spaceId = location.pathname.split('/')[2];
          await composer.invoke('org.dxos.operation.code.createSpecReview', { spec, content }, { spaceId });
        },
        [CODE_SPEC, REVIEW_TEXT],
      );
    },
  },
  {
    name: "Prep (off camera): put features on plugin-code's map",
    setup: true,
    run: async ({ page }) => {
      // The Board lists the spec's feature objects; the `feat` blocks in its text are not features of the map.
      await page.evaluate(
        async ([name, features]) => {
          const project = composer.graph._model
            .filterNodes(() => true)
            .find(({ id }) => /\/org\.dxos\.type\.project\/[^/]+$/.test(id)).data.data;
          const spec = project.specs.find((ref) => ref.target?.name === name) ?? project.specs[0];
          const spaceId = location.pathname.split('/')[2];
          for (const [feature, status] of features) {
            await composer.invoke(
              'org.dxos.operation.code.createFeature',
              { name: feature, status, spec },
              { spaceId },
            );
          }
        },
        [CODE_SPEC, BOARD_FEATURES],
      );
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
    name: 'Open Definitions',
    narration:
      "Structure's first view, Definitions, draws the spec as clusters of features around the blocks they share.",
    run: async ({ demo, page }) => {
      await demo.title({ value: "A spec's companion tabs", subtitle: 'Structure, Decisions and Review' });
      await caption(demo, 1, 'Structure › Definitions: the spec as clusters');
      await demo.click({ selector: '[data-testid="plankHeading.companion"] >> nth=0', label: 'Companion' });
      await openTab(demo, page, 'structure', 'Structure');
      if ((await page.locator(CLUSTER).count()) === 0 && (await page.locator(view('definitions')).count()) > 0) {
        await demo.click({ selector: view('definitions'), label: 'Definitions' });
      }
      await page.locator(cluster('CoderSkill')).waitFor({ state: 'visible', timeout: 20_000 });
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Open a cluster',
    narration: 'Double-clicking a cluster opens its features, each framing what only it names.',
    run: async ({ demo, page }) => {
      await caption(demo, 2, 'Double-click a cluster to open its features');
      await open(demo, page, cluster('CoderSkill'), 'CoderSkill');
      await page.locator(CLUSTER).first().waitFor({ state: 'detached', timeout: 15_000 });
      await page.locator(card('F-8')).waitFor({ state: 'visible', timeout: 30_000 });
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Open Related',
    narration: "Related, Structure's second view, centres on the block nearest the editor's cursor.",
    run: async ({ demo, page }) => {
      await caption(demo, 3, 'Structure › Related: the block at the cursor');
      await openView(demo, page, 'related', 'Related', '[data-testid="definition-related.focus"]');
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Put the cursor in a feature',
    narration: 'Clicking into a feature centres Related on it, with what it names below.',
    run: async ({ demo, page }) => {
      await caption(demo, 4, 'Click into F-8: Related centres on it');
      await scrollToLine(page, 'feat F-8:');
      await demo.click({ selector: await blockId(page, 'feat F-8:', 'F-8'), label: 'F-8' });
      await waitForRelated(page, 'F-8');
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Move the cursor to the next feature',
    narration: 'As the cursor moves down into the next block, Related moves with it.',
    run: async ({ demo, page }) => {
      await caption(demo, 5, 'Arrow down into F-9: Related follows');
      for (let lines = 0; lines < 40; lines++) {
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(180);
        if ((await page.locator(`${RELATED}[data-definition="F-9"]`).count()) > 0) {
          break;
        }
      }
      await waitForRelated(page, 'F-9');
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Move the cursor to a type',
    narration: 'In a type, Related shows the features that name it above.',
    run: async ({ demo, page }) => {
      await caption(demo, 6, 'Click into a type: the features naming it');
      await scrollToLine(page, 'type CodeProject', -1);
      await demo.click({ selector: await blockId(page, 'type CodeProject', 'CodeProject'), label: 'CodeProject' });
      await waitForRelated(page, 'CodeProject');
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Open Data model',
    narration: "Data model lists the spec's types and their fields.",
    run: async ({ demo, page }) => {
      await caption(demo, 7, "Structure › Data model: the spec's types");
      await openView(demo, page, 'data', 'Data model', '[data-testid="data-model.type"]');
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Open API',
    narration: "API lists the spec's operations and services.",
    run: async ({ demo, page }) => {
      await caption(demo, 8, "Structure › API: the spec's operations");
      await openView(demo, page, 'api', 'API', '[data-testid="api-surface.op"]');
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Open Board',
    narration: "Board, the software dialect's last Structure view, shows the spec's features by status.",
    run: async ({ demo, page }) => {
      await caption(demo, 9, 'Structure › Board: the features by status');
      await openView(demo, page, 'kanban', 'Board', '[data-testid="board-column"]');
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Open Decisions at the cursor',
    narration: 'At cursor, the first Decisions view, shows what holds on the item at the cursor.',
    run: async ({ demo, page }) => {
      await caption(demo, 10, 'Decisions › At cursor: what holds on F-22.4');
      await scrollToLine(page, 'req F-22.4:');
      await demo.click({ selector: await blockId(page, 'req F-22.4:', 'F-22.4'), label: 'F-22.4' });
      await openTab(demo, page, 'decisions', 'Decisions');
      await page
        .locator(`${COMPANION} [data-testid="decision-cursor"][data-focus="F-22.4"]`)
        .waitFor({ state: 'visible', timeout: 15_000 });
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Open the Ledger',
    narration: 'The Ledger opens on a card per block, the most recently decided first.',
    run: async ({ demo, page }) => {
      await caption(demo, 11, 'Decisions › Ledger: a card per block');
      await openView(demo, page, 'ledger', 'Ledger', LEDGER_BLOCK);
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Open a block',
    narration: 'A block opens its threads: the decisions on it that cite one another.',
    run: async ({ demo, page }) => {
      await caption(demo, 12, 'Open SpecViewContent: its threads');
      await demo.click({
        selector: `${COMPANION} ${LEDGER_BLOCK}[data-block="SpecViewContent"]`,
        label: 'SpecViewContent',
      });
      await page.locator(`${COMPANION} ${LEDGER_THREAD}`).first().waitFor({ state: 'visible', timeout: 10_000 });
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Open a thread',
    narration: 'A thread shows what holds now, then its decisions by day, with approval at the top.',
    run: async ({ demo, page }) => {
      await caption(demo, 13, 'Open a thread: what holds now, then each day');
      await demo.click({ selector: `${COMPANION} ${LEDGER_THREAD} >> nth=0`, label: 'Thread' });
      await page
        .locator(`${COMPANION} [data-testid="decision-ledger.holds-now"]`)
        .waitFor({ state: 'visible', timeout: 10_000 });
      await demo.sleep({ ms: LOOK + 1_000 });
    },
  },
  {
    name: 'Open Review',
    narration: "Review shows the spec's latest compliance review, a verdict per item.",
    run: async ({ demo, page }) => {
      await caption(demo, 14, 'Review › the latest compliance review');
      await openTab(demo, page, 'review', 'Review');
      await openView(
        demo,
        page,
        'review',
        'Review',
        ':is([data-testid="review-panel"], [data-testid="review-panel.empty"])',
      );
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Open Code',
    narration: 'A verdict opens the code it cites in Code, at its symbol.',
    run: async ({ demo, page }) => {
      await caption(demo, 15, 'Review › Code: the source a verdict cites');
      await demo.click({ selector: `${COMPANION} [data-testid="review-panel.count.done"]`, label: 'Done' });
      // buildProject's verdict cites the function that compiles a project.
      const verdict = `${COMPANION} [data-testid="verdict-card"]:has(:text-is("buildProject"))`;
      await page.locator(verdict).first().waitFor({ state: 'visible', timeout: 10_000 });
      await page.locator(verdict).first().scrollIntoViewIfNeeded();
      await demo.click({ selector: `${verdict} button[aria-label="Verdict actions"]`, label: 'Verdict actions' });
      await demo.click({
        selector: '[data-testid="verdict-card.open-code"]:has-text("compileEntry")',
        label: 'compileEntry',
      });
      await page.locator(`${COMPANION} [data-testid="code-view"]`).waitFor({ state: 'visible', timeout: 15_000 });
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Open the launch video',
    narration:
      'A script in the video dialect offers only the views that read any dialect, such as Definitions and Related.',
    run: async ({ demo, page }) => {
      await caption(demo, 16, 'A video script: only the views for any dialect');
      await openTab(demo, page, 'structure', 'Structure');
      await pickSpec(page, VIDEO_SPEC, demo);
      await openView(demo, page, 'definitions', 'Definitions', '[data-cluster="cluster:maya"]');
      await page.locator(view('data')).waitFor({ state: 'detached', timeout: 10_000 });
      await caption(demo, 16, "No Data model, API, Board or Code: they are software's");
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: "Open a character's cluster",
    narration: 'Definitions drills into a script as it does into code: a frame per scene, holding its shots and lines.',
    run: async ({ demo, page }) => {
      await caption(demo, 17, "Double-click maya's cluster: a frame per scene");
      await open(demo, page, cluster('maya'), 'Maya');
      await page.locator(CLUSTER).first().waitFor({ state: 'detached', timeout: 15_000 });
      await page.locator(`${card('SC-2')}[data-opens]`).waitFor({ state: 'visible', timeout: 30_000 });
      await demo.sleep({ ms: LOOK + 1_000 });
    },
  },
  {
    name: 'Open a scene',
    narration:
      'A scene opens onto everything it touches: its shots, voiceover and captions, its cast and its screenings.',
    run: async ({ demo, page }) => {
      await caption(demo, 18, 'Double-click SC-2: everything it touches');
      await open(demo, page, card('SC-2'), 'SC-2');
      await page
        .locator(`${COMPANION} [data-testid="definition-canvas.card"][data-focused]`)
        .waitFor({ state: 'visible', timeout: 15_000 });
      await demo.sleep({ ms: LOOK + 1_000 });
    },
  },
  {
    name: 'Put the cursor in a scene',
    narration: 'Related follows the cursor through the script as it does through code.',
    run: async ({ demo, page }) => {
      await caption(demo, 19, 'Related: follows the cursor into SC-3');
      await openView(demo, page, 'related', 'Related', '[data-testid="definition-related.focus"]');
      await scrollToLine(page, 'scene SC-3');
      await demo.click({ selector: await blockId(page, 'scene SC-3', 'SC-3'), label: 'SC-3' });
      await waitForRelated(page, 'SC-3');
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: "Open the script's decisions",
    narration: 'Every dialect extends the changelog, so Decisions reads the script the same way.',
    run: async ({ demo, page }) => {
      await caption(demo, 20, "Decisions: any dialect — the script's changelog");
      await openTab(demo, page, 'decisions', 'Decisions');
      await openView(demo, page, 'ledger', 'Ledger', LEDGER_BLOCK);
      await demo.sleep({ ms: LOOK });
      await demo.clearCaption();
      await demo.sleep({ ms: 2_000 });
    },
  },
];
