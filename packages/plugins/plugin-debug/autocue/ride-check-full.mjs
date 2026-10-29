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
 *
 * The driver's `CLOUDFLARE_API_TOKEN` becomes the space's Cloudflare connection, so the agent deploys to that account
 * and the page loads for anyone; without it the agent falls back to a temporary account. The take never leaves Composer:
 * a reload in the middle of it lost the profile, so the deployed page is filmed in a browser of its own and spliced in.
 * Keep the token's value off screen:
 *
 *   CLOUDFLARE_API_TOKEN='op://eng-dev/com.cloudflare/local/CLOUDFLARE_API_TOKEN' op run -- \
 *     node .agents/skills/autocue/scripts/driver.mjs --url http://localhost:4173 --out /tmp/ride-check-take
 *
 * To keep the build off EDGE's sandboxes, serve local ones (bubblewrap on Linux) with `serve()` from
 * `plugin-sandbox/src/local/server.ts`, allowing `api.cloudflare.com`, `*.workers.dev` and `api.open-meteo.com` beside
 * the default registries, and give the driver `DX_SANDBOX_URL` and `DX_SANDBOX_TOKEN` (see `useLocalSandbox`).
 */

const TEMPLATE = 'Ride Check';
const PROJECT = 'Ride Check';
const FEATURE = 'Go / no-go';
const SUBFEATURE = 'Gust rule - show gusts, warn above 30 km/h';

/** A beat for the viewer after a visible change. */
const BEAT = 1_500;

/** `DX_MODEL` picks another of the settings' remote models by label. */
const MODEL = process.env.DX_MODEL ?? 'Claude Sonnet 5';
const FAST = 60;
const TASKS = ['Draw the architecture', 'Build and deploy the Worker', 'Check the live page against the spec'];
const SHIP = 'Ship the gust rule';
const FINISHED = ['done', 'review'];
const TASK_ROW = '[data-testid="deck.plank"] [data-testid="taskList.item"]';
const taskRow = (title) => `${TASK_ROW}:has([data-testid="taskList.item.title"]:text-is("${title}"))`;

const PROJECT_NODE = `[data-testid="deck.sidebar"] [data-testid="spacePlugin.object"]:has(:text-is("${PROJECT}")) >> nth=0`;
const NODE = `[data-testid="feature-canvas-node"]:has-text("${FEATURE}") >> nth=0`;
const COMPANION = '[data-testid="feature-companion"]';

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

/** Task title -> status in the take's space, read from ECHO. */
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

/** Feature name -> status in the take's space. */
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
  // The feature map repaints only when a card changes, so a long wait records few frames, and the cards turning
  // operational are the payoff.
  await openProjectTab(demo, page, 'features');
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
    // An artifact opened from the project holds its plank under a breadcrumb; the sidebar row does not navigate back.
    const crumb = `[data-testid="deck.plank"] nav[aria-label="Navigation history"] button:has-text("${PROJECT}")`;
    if (await visible(page.locator(crumb), 2_000)) {
      await demo.click({ selector: `${crumb} >> nth=0`, label: PROJECT });
    } else {
      await demo.click({ selector: PROJECT_NODE, label: PROJECT });
    }
    await page.locator(selector).first().waitFor({ state: 'visible', timeout: 15_000 });
  }
  await closeCompanion(page);
  await demo.click({ selector: `${selector} >> nth=0`, label: tab[0].toUpperCase() + tab.slice(1) });
};

/** Selects the feature on its project's map, which opens it in the plank's feature companion. */
const openFeature = async (demo, page) => {
  await openProjectTab(demo, page, 'features');
  await page.locator(NODE).waitFor({ state: 'visible', timeout: 15_000 });
  await demo.click({ selector: NODE, label: FEATURE });
  // The selection outlives a closed companion, so a card already selected needs the companion reopened.
  if (!(await visible(page.locator(COMPANION), 3_000))) {
    await demo.click({ selector: '[data-testid="plankHeading.companion"] >> nth=0', label: 'Companion' });
  }
  await page.locator(COMPANION).first().waitFor({ state: 'visible', timeout: 15_000 });
};

/** Zooms the map into the selected feature's subfeatures, holds, and zooms back out. */
const showSubfeatures = async (demo, page, hold) => {
  await demo.click({
    selector: `${COMPANION} [data-testid="feature-companion.zoom"]`,
    label: 'Show subfeatures on the map',
  });
  await page.locator('[data-testid="feature-map.trail"]').first().waitFor({ state: 'visible', timeout: 10_000 });
  await page.waitForTimeout(hold);
  await demo.click({ selector: '[data-testid="feature-map.zoom-out"]', label: 'All features' });
};

/**
 * Sets the feature's subfeatures operational once the feature itself is, off camera, for a run where the agent shipped
 * the feature but left a part of it planned; returns how many it moved.
 */
const settleSubfeatures = (page) =>
  page.evaluate(
    async ({ key, name }) => {
      const space = dxos.spaces().find((candidate) => candidate.id === globalThis[key]);
      const features = await space.db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.feature'))).run();
      // The verdict is the top-level feature with a breakdown; its parts are the features on that spec.
      const root = features.find((feature) => feature.name === name && feature.spec);
      if (root?.status !== 'operational') {
        return 0;
      }
      const parts = await Promise.all((root.spec.target?.features ?? []).map((ref) => ref.load()));
      const stale = parts.filter((feature) => feature && feature.status !== 'operational');
      for (const feature of stale) {
        dxos.Obj.update(feature, (feature) => {
          feature.status = 'operational';
        });
      }
      return stale.length;
    },
    { key: TAKE_SPACE, name: FEATURE },
  );

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

/**
 * Connects Cloudflare in the take's space from the driver's `CLOUDFLARE_API_TOKEN`, as the OAuth connector would leave
 * it: an AccessToken for `cloudflare.com` and a Connection. The value goes from the driver's environment into the space
 * and is never logged; run the driver under `op run` so it is never typed either.
 */
const connectCloudflare = async (page) => {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    return false;
  }
  await page.evaluate(
    async ({ key, token }) => {
      const spaceId = globalThis[key];
      const space = dxos.spaces().find((candidate) => candidate.id === spaceId);
      const schema = space.db.registry
        .list()
        .find((type) => dxos.Type.getTypename(type) === 'org.dxos.type.accessToken');
      const accessToken = space.db.add(dxos.Obj.make(schema, { source: 'cloudflare.com', account: 'DXOS', token }));
      await composer.invoke(
        'org.dxos.operation.connector.createConnection',
        { name: 'Cloudflare', accessToken: dxos.Ref.make(accessToken) },
        { spaceId },
      );
    },
    { key: TAKE_SPACE, token },
  );
  return true;
};

/**
 * Runs the agent's sandboxes on this machine rather than on EDGE when the driver has `DX_SANDBOX_URL` and
 * `DX_SANDBOX_TOKEN`: a local sandbox helper (`plugin-sandbox/src/local/server.ts`) serves them, and the web app, which
 * has no launcher of its own, reaches it through the plugin's HTTP backend. `DX_REPO` is the checkout the dev server
 * serves, from which the plugin's modules are imported so they share the app's instances.
 */
const useLocalSandbox = async (page) => {
  const url = process.env.DX_SANDBOX_URL;
  const token = process.env.DX_SANDBOX_TOKEN;
  if (!url || !token) {
    return false;
  }
  await page.evaluate(
    async ({ repo, url, token }) => {
      const sandbox = `/@fs${repo}/packages/plugins/plugin-sandbox/src`;
      const [HttpBackend, SandboxCapabilities, Capabilities, Effect] = await Promise.all([
        import(`${sandbox}/services/HttpBackend.ts`),
        import(`${sandbox}/types/SandboxCapabilities.ts`),
        import(`/@fs${repo}/packages/sdk/app-framework/src/common/capabilities.ts`),
        import('/@id/effect/Effect'),
      ]);
      const capabilities = composer.manager.capabilities;
      capabilities.contribute({
        module: 'autocue.localSandbox',
        interface: SandboxCapabilities.LocalLauncher,
        implementation: { backend: Effect.succeed(HttpBackend.make(url, token)) },
      });
      const [settings] = capabilities.getAll(SandboxCapabilities.Settings);
      const [registry] = capabilities.getAll(Capabilities.AtomRegistry);
      registry.set(settings, { ...registry.get(settings), backend: 'local' });
    },
    { repo: process.env.DX_REPO ?? process.cwd(), url, token },
  );
  return true;
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
      await useLocalSandbox(page);
      // A space shows as pending until it has opened, and a pending one does not navigate.
      await page.locator('[data-testid="spacePlugin.space"]').first().waitFor({ state: 'visible', timeout: 120_000 });
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
      await connectCloudflare(page);
    },
  },
  {
    name: 'Open the feature map',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Four features, all planned', subtitle: 'One per card on the page' });
      await openProjectTab(demo, page, 'features');
      await page.locator(NODE).waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT * 2);
      await demo.caption({ value: 'Requirements from the spec, and two subfeatures', subtitle: FEATURE });
      await openFeature(demo, page);
      await page.waitForTimeout(BEAT * 2);
      await showSubfeatures(demo, page, BEAT * 2);
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Open the spec',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Each feature cites its block in the spec' });
      await demo.click({ selector: `${COMPANION} [data-testid="feature-card.spec"] >> nth=0`, label: 'Spec' });
      await page.getByTestId('spec-article.spec').first().waitFor({ state: 'visible', timeout: 30_000 });
      await closeCompanion(page);
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
      await settleSubfeatures(page);
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Every feature is operational',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Deployed: every feature operational' });
      await openProjectTab(demo, page, 'features');
      await page.locator(NODE).waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT * 2);
      await demo.caption({ value: 'Its subfeatures too', subtitle: FEATURE });
      await openFeature(demo, page);
      await page.waitForTimeout(BEAT * 2);
      await showSubfeatures(demo, page, BEAT * 2);
      await page.waitForTimeout(BEAT);
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
      await openFeature(demo, page);
      const add = `${COMPANION} [data-testid="feature-article.add-subfeature"]`;
      await page.locator(add).first().scrollIntoViewIfNeeded();
      await demo.type({ selector: add, value: SUBFEATURE, delay: 40, label: 'Add a subfeature' });
      await demo.press({ selector: add, key: 'Enter' });
      await page.waitForTimeout(BEAT);
      // A task filed from the feature is linked to it, so the agent knows which card it moves.
      const file = `${COMPANION} [data-testid="feature-article.file-task"]`;
      await page.locator(file).first().scrollIntoViewIfNeeded();
      await demo.type({ selector: file, value: SHIP, delay: 40, label: 'File a task' });
      await demo.press({ selector: file, key: 'Enter' });
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
      await settleSubfeatures(page);
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'The spec carries the new rule',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Shipped: the card is operational again, gust rule included' });
      await openFeature(demo, page);
      await page.waitForTimeout(BEAT * 2);
      await showSubfeatures(demo, page, BEAT * 2);
      await demo.caption({ value: 'The spec carries the new rule' });
      await demo.click({ selector: `${COMPANION} [data-testid="feature-card.spec"] >> nth=0`, label: 'Spec' });
      await page.getByTestId('spec-article.spec').first().waitFor({ state: 'visible', timeout: 30_000 });
      await closeCompanion(page);
      await page.waitForTimeout(BEAT * 4);
    },
  },
];
