//
// Copyright 2026 DXOS.org
//

/**
 * Ride Check, all by the agent: create the space from its template, read the feature map and the spec, hand the three
 * tasks to the assistant and watch it draw the architecture, build the page with DXOS UI in a sandbox, deploy it as a
 * Cloudflare Worker and turn every feature operational. Then add a gust rule to the Go / no-go card, file a task for
 * it and watch the assistant change the spec and the code and redeploy. No terminal: every stretch the agent works
 * plays fast-forwarded.
 *
 * @mdl packages/plugins/plugin-debug/PLUGIN.mdl test QA-10
 * @app composer-app dev server on :4173 (`DX_DEV=true DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run
 *   composer-app:serve`), talking to EDGE preview, whose AI and sandbox services serve the model below
 */

const TEMPLATE = 'Ride Check';
const PROJECT = 'Ride Check';
const FEATURE = 'Go / no-go';
const SUBFEATURE = 'Gust rule — warn above 30 km/h';

/** A beat for the viewer after a visible change. */
const BEAT = 1_500;

const MODEL = 'DeepSeek V4 Pro';
const FAST = 60;
const TASKS = ['Draw the architecture', 'Build and deploy the Worker', 'Check the live page against the spec'];
const SHIP = 'Ship the gust rule';
const FINISHED = ['done', 'review'];
const TASK_ROW = '[data-testid="deck.plank"] [data-testid="taskList.item"]';
const taskRow = (title) => `${TASK_ROW}:has([data-testid="taskList.item.title"]:text-is("${title}"))`;

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

/** Task title → status in the take's space, read from ECHO. */
const taskStatuses = (page) =>
  page
    .evaluate(async (key) => {
      const space = dxos.spaces().find((candidate) => candidate.id === globalThis[key]);
      const tasks = space
        ? await space.db
            .query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.task')))
            .run()
            .catch(() => [])
        : [];
      return Object.fromEntries(tasks.map((task) => [task.title, task.status]));
    }, TAKE_SPACE)
    .catch(() => ({}));

/** Feature name → status in the take's space. */
const featureStatuses = (page) =>
  page
    .evaluate(async (key) => {
      const space = dxos.spaces().find((candidate) => candidate.id === globalThis[key]);
      const features = space
        ? await space.db
            .query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.feature')))
            .run()
            .catch(() => [])
        : [];
      return Object.fromEntries(features.map((feature) => [feature.name, feature.status]));
    }, TAKE_SPACE)
    .catch(() => ({}));

/** Polls until `done` holds, fast-forwarded, failing with the last snapshot after `minutes`. */
const waitFor = async (demo, page, done, minutes, label) => {
  await demo.speed({ factor: FAST });
  const deadline = Date.now() + minutes * 60_000;
  for (;;) {
    const snapshot = { tasks: await taskStatuses(page), features: await featureStatuses(page) };
    if (done(snapshot)) {
      break;
    }
    if (Date.now() > deadline) {
      throw new Error(`${label} not finished in ${minutes} minutes: ${JSON.stringify(snapshot)}`);
    }
    await page.waitForTimeout(10_000);
  }
  await demo.speed({ factor: 1 });
};

const openProjectTab = async (demo, page, tab) => {
  const selector = `[data-testid="projectsPlugin.tab.${tab}"]`;
  if (!(await visible(page.locator(selector), 2_000))) {
    await demo.click({ selector: PROJECT_NODE, label: PROJECT });
  }
  await closeCompanion(page);
  await demo.click({ selector: `${selector} >> nth=0`, label: tab[0].toUpperCase() + tab.slice(1) });
};

const delegate = async (demo, page, titles) => {
  await openProjectTab(demo, page, 'tasks');
  for (const title of titles) {
    await page.locator(taskRow(title)).first().waitFor({ state: 'visible', timeout: 15_000 });
    await demo.click({ selector: `${taskRow(title)} >> [data-testid="taskList.item.checkbox"]`, label: title });
  }
  await demo.click({ selector: '[data-testid="projectsPlugin.delegateTasks"]', label: 'Assign to agent' });
  await page.getByTestId('projectsPlugin.pipeline.chart').first().waitFor({ state: 'visible', timeout: 30_000 });
  await closeCompanion(page);
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
    name: 'Open the feature map',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Four features, all planned', subtitle: 'One per card on the page' });
      await openProjectTab(demo, page, 'features');
      await page.locator(CARD).first().waitFor({ state: 'visible', timeout: 15_000 });
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
    name: 'Hand the plan to the agent',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Hand the three tasks to the agent',
        subtitle: 'Draw it, build and deploy it, check it',
      });
      await delegate(demo, page, TASKS);
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Watch it draw, build and deploy',
    done: async ({ page }) => {
      const tasks = await taskStatuses(page);
      return TASKS.every((title) => FINISHED.includes(tasks[title]));
    },
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'The agent draws, builds with DXOS UI and deploys',
        subtitle: 'In a sandbox, fast-forwarded',
      });
      await waitFor(demo, page, ({ tasks }) => TASKS.every((title) => FINISHED.includes(tasks[title])), 75, 'the plan');
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Every feature is operational',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Deployed: every feature operational' });
      await openProjectTab(demo, page, 'features');
      await page.locator(CARD).first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT * 3);
    },
  },
  {
    name: 'Open what it filed',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'The diagram and the Worker URL, filed on the project' });
      await openProjectTab(demo, page, 'overview');
      const gallery = page.locator('[data-testid="projectsPlugin.artifacts"]').first();
      await gallery.waitFor({ state: 'visible', timeout: 15_000 });
      await gallery.scrollIntoViewIfNeeded();
      await page.waitForTimeout(BEAT * 2);
      await demo.click({
        selector: '[data-testid="projectsPlugin.artifacts"] :is(button,a,[role="button"],[data-scope="card"]) >> nth=0',
        label: 'Diagram',
      });
      await page.waitForTimeout(BEAT * 3);
    },
  },
  {
    name: 'Add the gust rule to the card and file it',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Change the feature', subtitle: `${FEATURE}: ${SUBFEATURE}` });
      await openProjectTab(demo, page, 'features');
      await demo.click({ selector: `${CARD} [data-testid="feature-card.menu"] button >> nth=0`, label: FEATURE });
      await demo.click({ selector: '[data-testid="feature-card.open"] >> nth=0', label: 'Open' });
      const editor = '[data-testid="deck.plank"] [data-testid="subfeature-editor"]';
      await page.locator(editor).first().waitFor({ state: 'visible', timeout: 15_000 });
      await demo.click({
        selector: `${editor} [data-testid="subfeature-editor.add"] >> nth=0`,
        label: 'Add subfeature',
      });
      await page
        .locator(`${editor} [data-testid="subfeature-editor.2.name"]`)
        .first()
        .waitFor({ state: 'visible', timeout: 5_000 });
      await page.keyboard.type(SUBFEATURE, { delay: 40 });
      await page.keyboard.press('Enter');
      await page.waitForTimeout(BEAT);
      // A task filed from the feature's article is linked to it, so the agent knows which card it moves.
      const file = page
        .locator('[data-testid="deck.plank"]')
        .getByPlaceholder(/File a task/i)
        .first();
      await file.scrollIntoViewIfNeeded();
      await file.click();
      await page.keyboard.type(SHIP, { delay: 40 });
      await page.keyboard.press('Enter');
      await page.waitForFunction(
        async ({ key, title }) => {
          const space = dxos.spaces().find((candidate) => candidate.id === globalThis[key]);
          const tasks = await space.db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.task'))).run();
          return tasks.some((task) => task.title === title);
        },
        { key: TAKE_SPACE, title: SHIP },
        { timeout: 10_000 },
      );
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Hand the change to the agent',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Hand the change to the agent' });
      await delegate(demo, page, [SHIP]);
    },
  },
  {
    name: 'Watch it update the spec, the code and the Worker',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'The agent updates the spec and the code, and redeploys',
        subtitle: 'Same Worker, same URL',
      });
      await waitFor(
        demo,
        page,
        ({ tasks, features }) => FINISHED.includes(tasks[SHIP]) && features[FEATURE] === 'operational',
        45,
        'the gust rule',
      );
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'The spec carries the new rule',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Shipped: the spec carries the rule, the card is operational again' });
      await openProjectTab(demo, page, 'features');
      await page.locator(CARD).first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT * 3);
      await demo.click({ selector: `${CARD} [data-testid="feature-card.menu"] button >> nth=0`, label: FEATURE });
      await demo.click({ selector: '[data-testid="feature-card.open"] >> nth=0', label: 'Open' });
      await demo.click({ selector: '[data-testid="feature-card.spec"] >> nth=0', label: 'Spec' });
      await page.getByTestId('spec-article.spec').first().waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(BEAT * 4);
    },
  },
];
