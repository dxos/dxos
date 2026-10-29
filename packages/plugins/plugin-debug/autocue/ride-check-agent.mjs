//
// Copyright 2026 DXOS.org
//

/**
 * Ride Check with the agent: create the space from its template, hand "Draw the architecture" to the assistant, and
 * open the diagram it writes in the Drawing skill's language and files on the project. The agent's stretch plays
 * fast-forwarded.
 *
 * @mdl packages/plugins/plugin-debug/PLUGIN.mdl test QA-10
 * @app composer-app dev server on :4173 (`DX_DEV=true DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run
 *   composer-app:serve`), talking to EDGE preview, whose AI service serves the model below
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

const MODEL = 'DeepSeek V4 Pro';
const TASK = 'Draw the architecture';
const FAST = 10;
const TASK_ROW = '[data-testid="deck.plank"] [data-testid="taskList.item"]';
const taskRow = (title) => `${TASK_ROW}:has([data-testid="taskList.item.title"]:text-is("${title}"))`;

/** The task's status in the take's space, read from ECHO. */
const status = (page, title) =>
  page
    .evaluate(
      async ({ title, key }) => {
        const space = dxos.spaces().find((candidate) => candidate.id === globalThis[key]);
        const tasks = space
          ? await space.db
              .query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.task')))
              .run()
              .catch(() => [])
          : [];
        return tasks.find((task) => task.title === title)?.status;
      },
      { title, key: TAKE_SPACE },
    )
    .catch(() => undefined);

const drawingCount = (page) =>
  page
    .evaluate(async (key) => {
      const space = dxos.spaces().find((candidate) => candidate.id === globalThis[key]);
      const drawings = space
        ? await space.db
            .query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.drawing')))
            .run()
            .catch(() => [])
        : [];
      return drawings.length;
    }, TAKE_SPACE)
    .catch(() => 0);

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
      await demo.click({ selector: '[data-testid="settings.org.dxos.plugin.assistant"]', hud: false });
      await demo.click({ selector: 'role=combobox[name="Remote language model"]', hud: false });
      await demo.click({ selector: `role=option[name="${MODEL}"]`, hud: false });
      await page.locator('role=combobox[name="Remote language model"]', { hasText: MODEL }).waitFor();
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
    name: 'Hand the diagram task to the agent',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Hand "Draw the architecture" to the agent' });
      await demo.click({ selector: PROJECT_NODE, label: PROJECT });
      await closeCompanion(page);
      await demo.click({ selector: '[data-testid="projectsPlugin.tab.tasks"] >> nth=0', label: 'Tasks' });
      await page.locator(taskRow(TASK)).first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT);
      await demo.click({ selector: `${taskRow(TASK)} >> [data-testid="taskList.item.checkbox"]`, label: TASK });
      await demo.click({ selector: '[data-testid="projectsPlugin.delegateTasks"]', label: 'Assign to agent' });
      await page.getByTestId('projectsPlugin.pipeline.chart').first().waitFor({ state: 'visible', timeout: 30_000 });
      await closeCompanion(page);
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Watch the agent draw',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'The agent writes the diagram as text',
        subtitle: 'The layout engine places every box',
      });
      await demo.speed({ factor: FAST });
      const deadline = Date.now() + 20 * 60_000;
      while ((await drawingCount(page)) === 0 || !['done', 'review'].includes(await status(page, TASK))) {
        if (Date.now() > deadline) {
          throw new Error(`no drawing within twenty minutes: status ${await status(page, TASK)}`);
        }
        await page.waitForTimeout(3_000);
      }
      await demo.speed({ factor: 1 });
    },
  },
  {
    name: 'Open the drawing',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Drawn by the agent, filed on the project' });
      await demo.click({ selector: '[data-testid="projectsPlugin.tab.overview"] >> nth=0', label: 'Overview' });
      const gallery = page.locator('[data-testid="projectsPlugin.artifacts"]').first();
      await gallery.waitFor({ state: 'visible', timeout: 15_000 });
      await gallery.scrollIntoViewIfNeeded();
      await page.waitForTimeout(BEAT);
      await demo.click({
        selector: '[data-testid="projectsPlugin.artifacts"] :is(button,a,[role="button"],[data-scope="card"]) >> nth=0',
        label: 'Diagram',
      });
      // The canvas editor renders its shapes as DOM; a label the agent must have drawn says it has laid out.
      await page
        .locator('[data-testid="deck.plank"]')
        .getByText('Open-Meteo', { exact: false })
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 });
      await closeCompanion(page);
      await page.waitForTimeout(BEAT * 4);
    },
  },
];
