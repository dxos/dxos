//
// Copyright 2026 DXOS.org
//

/**
 * A spec nested beneath another is picked from the Specs tab's dropdown, indented under its parent, and the nav tree
 * lists no specs. Showing a feature's subfeatures picks the spec that breaks it down.
 *
 * @mdl packages/plugins/plugin-projects/PLUGIN.mdl test QA-11
 * @app composer-app via `DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve -- --port 4173`;
 *   the setup step enables plugin-code and plugin-debug when the build does not (`DX_DEV=true` does).
 *
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7337 --url http://localhost:4173 --out /tmp/demo
 *   node .agents/skills/autocue/scripts/trim-static.mjs --in /tmp/demo/session.webm --out nested-specs.webm --mp4
 */

const SUBTITLE = 'from plugin-projects/PLUGIN.mdl QA-11';
const TEMPLATE = 'Ride Check';
const PROJECT = 'Ride Check';
const NESTED = 'Go / no-go';

/** Time to read a caption before the gesture it describes. */
const READ = 2_500;

/** Time to look at what a gesture changed. */
const LOOK = 3_000;

/** Where the take's own space id is kept in the page, so a replay that reuses the page still finds it. */
const TAKE_SPACE = '__nestedSpecsSpace';

const PROJECT_NODE = `[data-testid="deck.sidebar"] [data-testid="spacePlugin.object"]:has(:text-is("${PROJECT}")) >> nth=0`;
const PICKER = '[data-testid="projectsPlugin.specPicker"]';
const MENU_ITEM = (name) => `[role="menu"] >> [role^="menuitem"]:has-text("${name}")`;
const DOCUMENT = '[data-testid="projectsPlugin.spec.document"] .cm-content';
const COMPANION = '[data-testid="deck.companion"]';
const STRUCTURE = '[data-testid="deck.companion.tab.spec-structure"]';
const BOARD = `${COMPANION} [data-testid="spec-companion.view.kanban"]`;
const CARD = `${COMPANION} [data-testid="feature-card"]:has-text("${NESTED}")`;
const ZOOM = '[data-testid="feature-companion.zoom"]';

const caption = (demo, step, text) => demo.caption({ value: `Step ${step} — ${text}`, subtitle: SUBTITLE, hold: READ });

const visible = (locator, timeout) =>
  locator
    .first()
    .waitFor({ state: 'visible', timeout })
    .then(
      () => true,
      () => false,
    );

/** Waits for the Specs tab's dropdown to name `name` and its editor to draw. */
const waitForSpec = (page, name) =>
  page.waitForFunction(
    ([picker, editor, name]) =>
      document.querySelector(editor) !== null && document.querySelector(picker)?.textContent.trim() === name,
    [PICKER, DOCUMENT, name],
    { timeout: 15_000 },
  );

const pickSpec = async (demo, page, name) => {
  await demo.click({ selector: PICKER, label: 'Spec dropdown' });
  await page.getByRole('menu').waitFor({ state: 'visible', timeout: 5_000 });
  await demo.click({ selector: MENU_ITEM(name), label: name });
  await waitForSpec(page, name);
};

/** Turns on each plugin in the registry's Labs list that is off. */
const enablePlugins = async (page, names) => {
  await page.goto(new URL('/w/dxos:registry/category/labs', page.url()).href);
  for (const name of names) {
    const toggle = page.getByRole('switch', { name, exact: true }).first();
    await toggle.waitFor({ state: 'attached', timeout: 60_000 });
    if (!(await toggle.isChecked())) {
      // The switch's input is visually hidden behind its control.
      await toggle.evaluate((input) => input.click());
      for (let attempt = 0; attempt < 40 && !(await toggle.isChecked()); attempt++) {
        await page.waitForTimeout(250);
      }
    }
  }
};

/** Expands Projects and the project until its row's children show; a new space re-renders its tree as it loads. */
const showProject = async (page) => {
  const trigger = page.locator('[data-testid="org.dxos.type.project.section"] [data-part="branch-trigger"]').first();
  const row = page.locator(PROJECT_NODE);
  for (let attempt = 0; attempt < 6; attempt++) {
    if (await visible(row, 2_000)) {
      break;
    }
    await trigger.waitFor({ state: 'visible', timeout: 15_000 });
    await trigger.click();
  }
  await row.waitFor({ state: 'visible', timeout: 5_000 });
};

/** Closes the companion if one is open, so the project gets the full width. */
const closeCompanion = async (page) => {
  const close = page.locator('[data-testid="plankHeading.closeCompanion"]').first();
  if (await visible(close, 2_000)) {
    await close.click({ timeout: 2_000 }).catch(() => {});
  }
};

export const steps = [
  {
    name: 'Prep (off camera): enable plugins, create the Ride Check space',
    setup: true,
    done: async ({ page }) =>
      page
        .evaluate((key) => dxos.spaces().some((space) => space.id === globalThis[key]), TAKE_SPACE)
        .catch(() => false),
    run: async ({ demo, page }) => {
      await page
        .locator('[data-testid="treeView.appSettings"]')
        .first()
        .waitFor({ state: 'visible', timeout: 300_000 });
      const notice = page.locator(
        '[data-testid="org.dxos.plugin.observability.notice"] button:not(:has-text("Settings"))',
      );
      if (await visible(notice, 5_000)) {
        await notice.first().click();
      }

      await enablePlugins(page, ['Code', 'Debug']);

      await demo.click({ selector: '[data-testid="treeView.appSettings"]', hud: false });
      await page.waitForURL(/dxos:settings/, { timeout: 10_000 });
      await demo.click({ selector: '[data-testid="settings.org.dxos.plugin.support"]', hud: false });
      const hideHelp = page.getByRole('switch', { name: 'Hide help panels' });
      await hideHelp.waitFor({ state: 'attached', timeout: 10_000 });
      if (!(await hideHelp.isChecked())) {
        await hideHelp.locator('xpath=ancestor::label[1]').click();
        for (let attempt = 0; attempt < 20 && !(await hideHelp.isChecked()); attempt++) {
          await page.waitForTimeout(250);
        }
      }

      await demo.click({ selector: '[data-testid="spacePlugin.addSpace"]', hud: false });
      await demo.click({ selector: 'role=menuitem[name="Create space"]', hud: false });
      await demo.click({
        selector: `[data-testid="create-space-dialog"] [role="option"]:has-text("${TEMPLATE}")`,
        hud: false,
      });
      const before = await page.evaluate(() => dxos.spaces().map((space) => space.id));
      await demo.click({ selector: '[data-testid="create-space-dialog"] button:has-text("Create")', hud: false });
      await page.waitForFunction(
        ({ before, key }) => {
          const created = dxos.spaces().find((space) => !before.includes(space.id));
          if (created) {
            globalThis[key] = created.id;
          }
          return created !== undefined;
        },
        { before, key: TAKE_SPACE },
        { timeout: 60_000 },
      );
      await page.getByTestId('org.dxos.type.project.section').first().waitFor({ state: 'visible', timeout: 60_000 });
      await closeCompanion(page);
      await showProject(page);
      await demo.cut();
    },
  },
  {
    name: 'Open the Specs tab',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Nested specs', subtitle: 'Picked from the Specs tab, not the nav tree', hold: 3_200 });
      await caption(demo, 1, 'Open Ride Check on its Specs tab');
      await demo.click({ selector: PROJECT_NODE, label: PROJECT });
      await closeCompanion(page);
      // Expanded, the project's row shows what the tree lists beneath it: Sessions and Artifacts, no specs.
      const expand = page.locator(`${PROJECT_NODE} >> [data-part="branch-trigger"]`).first();
      if ((await expand.getAttribute('aria-expanded').catch(() => null)) !== 'true') {
        await demo.click({ selector: `${PROJECT_NODE} >> [data-part="branch-trigger"]`, label: 'Expand' });
      }
      await demo.click({ selector: '[data-testid="projectsPlugin.tab.spec"] >> nth=0', label: 'Specs' });
      await waitForSpec(page, PROJECT);
      await page.waitForTimeout(LOOK);
    },
  },
  {
    name: 'Open the spec dropdown',
    run: async ({ demo, page }) => {
      await caption(demo, 2, `"${NESTED}" is nested under the project's spec`);
      await demo.click({ selector: PICKER, label: 'Spec dropdown' });
      await page.locator(MENU_ITEM(NESTED)).first().waitFor({ state: 'visible', timeout: 5_000 });
      await demo.hover({ selector: MENU_ITEM(NESTED) });
      await page.waitForTimeout(LOOK);
    },
  },
  {
    name: 'Pick the nested spec',
    run: async ({ demo, page }) => {
      await caption(demo, 3, `Pick "${NESTED}": the dropdown names the spec shown`);
      await demo.click({ selector: MENU_ITEM(NESTED), label: NESTED });
      await waitForSpec(page, NESTED);
      await page.locator(`${DOCUMENT}:has-text("Rain rule")`).first().waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(LOOK);
    },
  },
  {
    name: "Show a feature's subfeatures",
    run: async ({ demo, page }) => {
      await caption(demo, 4, `Show "${NESTED}"'s subfeatures from the board`);
      await pickSpec(demo, page, PROJECT);
      if (!(await visible(page.locator(STRUCTURE), 1_000))) {
        await demo.click({ selector: '[data-testid="plankHeading.companion"] >> nth=0', label: 'Companion' });
      }
      await demo.click({ selector: STRUCTURE, label: 'Structure' });
      await demo.click({ selector: BOARD, label: 'Board' });
      await page.locator(CARD).first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(1_000);
      await demo.click({ selector: CARD, label: NESTED });
      await page.locator(ZOOM).first().waitFor({ state: 'visible', timeout: 10_000 });
      await demo.click({ selector: ZOOM, label: 'Show subfeatures on the map' });
      await waitForSpec(page, NESTED);
      await page.waitForTimeout(LOOK);
    },
  },
  {
    name: 'The breakdown is picked',
    narration:
      'The nesting comes from the objects themselves: a breakdown spec sits under its feature, and the feature under its spec.',
    run: async ({ demo, page }) => {
      await caption(demo, 5, `The breakdown spec is picked; the nav tree never changed`);
      await page.waitForTimeout(8_000);
    },
  },
];
