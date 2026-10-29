//
// Copyright 2026 DXOS.org
//

/**
 * Ride Check in Composer: create the space from its template, read the feature map and the spec, draw the
 * architecture, then add a gust rule to the Go / no-go card. The redeploy and the live page are
 * `ride-check-redeploy.mjs`; the cut splices the two.
 *
 * @mdl packages/plugins/plugin-debug/PLUGIN.mdl test QA-10
 * @app composer-app dev server on :4173 (`DX_DEV=true DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve`);
 *   `DX_DEV` loads plugin-debug, whose template this is, since `dx-local.yml` pins `DX_ENVIRONMENT` to `local`
 *
 * The diagram is drawn through the Drawing skill's draw operation with `ride-check/architecture.dx`, the source the
 * agent's "Draw the architecture" task is asked to write, so the take does not wait on a model.
 */

const TEMPLATE = 'Ride Check';
const PROJECT = 'Ride Check';
const FEATURE = 'Go / no-go';
const SUBFEATURE = 'Gust rule - warn above 30 km/h';

/** Kept in step with `ride-check/architecture.dx`; flow scripts take no imports. */
const DIAGRAM = `diagram flow=down
node Browser "Rider's browser"
group worker "Cloudflare Worker" {
  node Page "Page · DXOS UI"
  node Api "GET /api/forecast" right-of Page
}
node Meteo "Open-Meteo" right-of Api
group cards "Feature cards" below worker {
  node Verdict "Go / no-go"
  node Hourly "Hourly forecast" right-of Verdict
  node Window "Best window" right-of Hourly
  node Daylight "Daylight" right-of Window
}
edge Browser -> Page "opens"
edge Page -> Api "fetch"
edge Api -> Meteo "forecast"
edge Page -> Verdict
edge Page -> Hourly
edge Page -> Window
edge Page -> Daylight`;

/** A beat for the viewer after a visible change. */
const BEAT = 1_500;

const PROJECT_NODE = `[data-testid="deck.sidebar"] [data-testid="spacePlugin.object"]:has(:text-is("${PROJECT}")) >> nth=0`;
const CARD = `[data-testid="feature-card"]:has-text("${FEATURE}")`;

/** Where the take's own space id is kept in the page, so a replay that reuses the page still finds it. */
const TAKE_SPACE = '__rideCheckSpace';

const visible = (locator, timeout) =>
  locator
    .first()
    .waitFor({ state: 'visible', timeout })
    .then(
      () => true,
      () => false,
    );

/** Closes the companion if one is open, so the project gets the full width. */
const closeCompanion = async (page) => {
  const close = page.locator('[data-testid="plankHeading.closeCompanion"]').first();
  if (await visible(close, 3_000)) {
    await close.click({ timeout: 2_000 }).catch(() => {});
  }
};

/** Expands Projects until the project's row shows; a new space re-renders its tree while its content loads. */
const showProject = async (page) => {
  const trigger = page.locator('[data-testid="org.dxos.type.project.section"] [data-part="branch-trigger"]').first();
  const row = page.locator(PROJECT_NODE);
  for (let attempt = 0; attempt < 6; attempt++) {
    if (await visible(row, 2_000)) {
      return;
    }
    await trigger.waitFor({ state: 'visible', timeout: 15_000 });
    await trigger.click();
  }
  await row.waitFor({ state: 'visible', timeout: 5_000 });
};

const openFeatures = async (demo, page) => {
  await demo.click({ selector: '[data-testid="projectsPlugin.tab.features"] >> nth=0', label: 'Features' });
  await page.locator(CARD).first().waitFor({ state: 'visible', timeout: 15_000 });
};

export const steps = [
  {
    name: 'Prep (off camera): dismiss notices, hide help panels',
    setup: true,
    run: async ({ demo, page }) => {
      // A cold dev server transforms modules on first request, so the sidebar can take minutes.
      await page
        .locator('[data-testid="treeView.appSettings"]')
        .first()
        .waitFor({ state: 'visible', timeout: 300_000 });
      const notice = page.locator(
        '[data-testid="org.dxos.plugin.observability.notice"] button:not(:has-text("Settings"))',
      );
      if (await visible(notice, 8_000)) {
        await notice.first().click();
      }
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
      await demo.click({ selector: '[data-testid="spacePlugin.space"] >> nth=0', hud: false });
      await closeCompanion(page);
      await demo.cut();
    },
  },
  {
    name: 'Create a space from the Ride Check template',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Ride Check', subtitle: 'From a spec to a live Cloudflare Worker', hold: 3_200 });
      await demo.caption({ value: 'Start from the Ride Check template' });
      await demo.click({ selector: '[data-testid="spacePlugin.addSpace"]', label: 'Add space' });
      await demo.click({ selector: 'role=menuitem[name="Create space"]', label: 'Create space' });
      await demo.click({
        selector: `[data-testid="create-space-dialog"] [role="option"]:has-text("${TEMPLATE}")`,
        label: TEMPLATE,
      });
      await page.waitForTimeout(BEAT);
      const before = await page.evaluate(() => dxos.spaces().map((space) => space.id));
      await demo.click({ selector: '[data-testid="create-space-dialog"] button:has-text("Create")', label: 'Create' });
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
    },
  },
  {
    name: 'Open the feature map',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Four features, one per card on the page' });
      await demo.click({ selector: PROJECT_NODE, label: PROJECT });
      await closeCompanion(page);
      await openFeatures(demo, page);
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Open the spec',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Each feature cites its block in the spec' });
      await demo.click({ selector: `${CARD} [data-testid="feature-card.menu"] button >> nth=0`, label: FEATURE });
      await demo.click({ selector: '[data-testid="feature-card.open"] >> nth=0', label: 'Open' });
      await demo.click({ selector: '[data-testid="feature-card.spec"] >> nth=0', label: 'Spec' });
      await page.getByTestId('spec-article.spec').first().waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(BEAT * 3);
    },
  },
  {
    name: 'Draw the architecture',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Draw the architecture',
        subtitle: 'Boxes and arrows as text; the layout engine places them',
      });
      const problems = await page.evaluate(
        async ({ key, source }) => {
          const options = { spaceId: globalThis[key] };
          const { object } = await composer.invoke(
            'org.dxos.operation.illustrator.create',
            { name: 'Ride Check architecture' },
            options,
          );
          const drawn = await composer.invoke(
            'org.dxos.operation.illustrator.draw',
            { drawing: dxos.Ref.make(object), source },
            options,
          );
          return drawn.problems.filter((problem) => problem.severity === 'error');
        },
        { key: TAKE_SPACE, source: DIAGRAM },
      );
      if (problems.length > 0) {
        throw new Error(`the diagram did not draw: ${JSON.stringify(problems)}`);
      }
      // A new drawing lands in the space's Drawings collection, not on the project.
      await demo.click({ selector: '[data-testid="deck.sidebar"] :text-is("Drawings") >> nth=0', label: 'Drawings' });
      await demo.click({
        selector: '[data-testid="deck.plank"] :text-is("Ride Check architecture") >> nth=0',
        label: 'Ride Check architecture',
      });
      await closeCompanion(page);
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll('[data-testid="deck.plank"] :is(svg, canvas)')].some(
            (element) => element.getBoundingClientRect().width > 400,
          ),
        undefined,
        { timeout: 30_000 },
      );
      await page.waitForTimeout(BEAT * 3);
    },
  },
  {
    name: 'Add the gust rule to the card',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Change the feature', subtitle: `${FEATURE}: ${SUBFEATURE}` });
      await demo.click({ selector: PROJECT_NODE, label: PROJECT });
      await openFeatures(demo, page);
      await demo.click({ selector: `${CARD} [data-testid="feature-card.menu"] button >> nth=0`, label: FEATURE });
      await demo.click({ selector: '[data-testid="feature-card.open"] >> nth=0', label: 'Open' });
      // Subfeatures are edited in the feature's article; the card only counts them.
      const editor = '[data-testid="deck.plank"] [data-testid="subfeature-editor"]';
      await page.locator(editor).first().waitFor({ state: 'visible', timeout: 15_000 });
      await demo.click({
        selector: `${editor} [data-testid="subfeature-editor.add"] >> nth=0`,
        label: 'Add subfeature',
      });
      const name = `${editor} [data-testid="subfeature-editor.2.name"]`;
      await page.locator(name).first().waitFor({ state: 'visible', timeout: 5_000 });
      await page.keyboard.type(SUBFEATURE, { delay: 40 });
      await page.keyboard.press('Enter');
      await page.waitForFunction(
        (text) =>
          [
            ...document.querySelectorAll(
              '[data-testid="deck.plank"] input, [data-testid="deck.plank"] [contenteditable]',
            ),
          ].some((element) => (element.value ?? element.textContent ?? '').includes(text)) ||
          document.querySelector('[data-testid="deck.plank"]')?.textContent?.includes(text),
        SUBFEATURE,
        { timeout: 5_000 },
      );
      await page.waitForTimeout(BEAT * 2);
    },
  },
];
