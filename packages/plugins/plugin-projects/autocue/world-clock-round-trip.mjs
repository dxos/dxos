//
// Copyright 2026 DXOS.org
//

// Re-imported with the driver's cache-busting query, which reaches only the file it loads, so an edit to either
// flow is picked up by the next `run` too.
const { prepare, steps: browserSteps } = await import(
  `../../plugin-dev-shell/autocue/composer-plugin.mjs${new URL(import.meta.url).search}`
);
const { steps: registrySteps } = await import(`./composer-plugin-registry.mjs${new URL(import.meta.url).search}`);

/**
 * The World Clock round trip, recorded for the investor demo rather than shown live: create a space from the World
 * Clock template, which holds the Composer Plugin project, the spec World Clock is built from and its feature map;
 * hand the build to the assistant, which publishes it to the reader's private registry with the spec bundled;
 * install it from Plugins → Registry, open its Clocks page, then open its page in the registry and click Open
 * Specification, which shows the spec the space started from.
 *
 * @mdl packages/plugins/plugin-projects/PLUGIN.mdl test QA-6
 * @app composer-app production bundle served by `vite preview` on :4173, talking to EDGE dev
 *
 *   export DX_EDGE_BASE_URL=https://dev.dxos.network/ DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   export DX_PLUGIN_TOOLCHAIN_COMMIT=<a main commit pkg.pr.new has published, carrying world-clock.mdl>
 *   export DX_PLUGIN_TOOLCHAIN_CLI=<an npm tarball URL of a `dx` with `registry publish --private`>   # until one ships
 *   moon run composer-app:bundle
 *   pnpm exec vite preview --configLoader native --port 4173 --strictPort
 *
 * Remote plugins install only from a bundle (vite dev has no import map). EDGE must run registry-service with its
 * `PLUGIN_REGISTRY_DB`. `DX_ENVIRONMENT=dev` turns plugin-code on, which renders the spec; the prep enables it if not.
 * The template is offered only where the Composer Plugin project template is: a bundle stamped with the toolchain and
 * an EDGE to build on.
 */

const TEMPLATE = 'World Clock';
const PROJECT = 'World Clock';

/** The plugin the agent builds, as the template's tasks name it. */
const PLUGIN_NAME = 'World Clock';

/** The template's parent task; the agent finishes it as `done`, or `review` when its brief asks for sign-off. */
const PARENT_TASK = 'Build the World Clock plugin';

/** The spec's first feature, whose card the take opens the spec from and whose title the registry's spec shows. */
const FEATURE = 'Clocks page';

/** EDGE dev's ai-service serves Anthropic but not DeepSeek, the model the shared prep picks. */
const MODEL = 'Claude Sonnet 5';

const CODE_PLUGIN = 'org.dxos.plugin.code';

const TWENTY_FIVE_MIN = 25 * 60_000;

/** Agent stretches play at this factor, with the trimmer's fast-forward badge on screen. */
const FAST = 10;

/** A beat for the viewer after a visible change. */
const BEAT = 1_500;

/** Where the take's own space id is kept in the page, so a replay that reuses the page still finds it. */
const TAKE_SPACE = '__worldClockSpace';

/** The project's own row in the navtree, under Projects. */
const PROJECT_NODE = `[data-testid="deck.sidebar"] [data-testid="spacePlugin.object"]:has(:text-is("${PROJECT}")) >> nth=0`;

/** A plugin card in the registry list, by its display name. */
const card = (name) => `li[data-testid^="pluginList."]:has(span:text-is("${name}"))`;

const visible = (locator, timeout) =>
  locator
    .first()
    .waitFor({ state: 'visible', timeout })
    .then(
      () => true,
      () => false,
    );

/** One of the other flows' steps, by name, so this take keeps their selectors and waits. */
const borrow = (flow, name) => {
  const found = flow.find((candidate) => candidate.name === name);
  if (!found) {
    throw new Error(`no step "${name}" to borrow`);
  }
  return found;
};

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

/** Whether the agent has finished the parent task in the take's space, read from ECHO rather than the screen. */
const parentDone = ({ page }) =>
  page
    .evaluate(
      async ({ key, title }) => {
        const space = dxos.spaces().find((candidate) => candidate.id === globalThis[key]);
        const tasks = space
          ? await space.db
              .query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.task')))
              .run()
              .catch(() => [])
          : [];
        return tasks.some((task) => task.title === title && ['done', 'review'].includes(task.status));
      },
      { key: TAKE_SPACE, title: PARENT_TASK },
    )
    .catch(() => false);

const installed = ({ page }) =>
  page.evaluate((name) => composer.plugins().some((plugin) => plugin.name === name), PLUGIN_NAME);

/** The take's space in the rail. */
const spaceTab = async (page) => {
  const id = await page.evaluate((key) => globalThis[key], TAKE_SPACE);
  return `[data-testid="spacePlugin.space"][data-value$="${id}"]`;
};

export const steps = [
  {
    name: 'Prep (off camera): uninstall the last take, pick the model, enable Code',
    setup: true,
    run: async (context) => {
      const { demo, page } = context;
      await prepare(context, { codingDev: false });
      await demo.click({ selector: '[data-testid="treeView.appSettings"]', hud: false });
      await page.waitForURL(/dxos:settings/, { timeout: 10_000 });
      await demo.click({ selector: '[data-testid="settings.org.dxos.plugin.assistant"]', hud: false });
      await demo.click({ selector: 'role=combobox[name="Remote language model"]', hud: false });
      await demo.click({ selector: `role=option[name="${MODEL}"]`, hud: false });
      await page.locator('role=combobox[name="Remote language model"]', { hasText: MODEL }).waitFor();

      // Code renders the spec the registry opens; without it the Open Specification chip never shows.
      await demo.click({ selector: '[data-testid="treeView.pluginRegistry"]', hud: false });
      await demo.fill({ selector: 'input[placeholder="Filter…"]', value: 'Code', hud: false });
      const toggle = page.locator(`input[id="${CODE_PLUGIN}-input"]`);
      if (await visible(toggle, 10_000)) {
        if (!(await toggle.isChecked())) {
          await toggle.click();
        }
      }
      await demo.fill({ selector: 'input[placeholder="Filter…"]', value: '', hud: false });
      await demo.click({ selector: '[data-testid="spacePlugin.space"] >> nth=0', hud: false });
      await closeCompanion(page);
      await demo.cut();
    },
  },
  {
    name: 'Create a space from the World Clock template',
    done: ({ page }) => page.evaluate((key) => !!globalThis[key], TAKE_SPACE).catch(() => false),
    run: async ({ demo, page }) => {
      await demo.title({
        value: 'World Clock',
        subtitle: 'From a space template to a plugin and its spec',
        hold: 3_600,
      });
      await demo.caption({ value: 'Create a space from the World Clock template', subtitle: 'plugin-projects QA-6' });
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
    name: 'Open the project and its tasks',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'The project: one parent task over four subtasks',
        subtitle: 'plugin-projects QA-6',
      });
      await showProject(page);
      await demo.click({ selector: PROJECT_NODE, label: PROJECT });
      await demo.click({ selector: '[data-testid="projectsPlugin.tab.tasks"] >> nth=0', label: 'Tasks' });
      await page.getByTestId('taskList.item').nth(4).waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Open the feature map and the spec',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Five features, each a feat block of the spec it is built from' });
      await demo.click({ selector: '[data-testid="projectsPlugin.tab.features"] >> nth=0', label: 'Features' });
      await demo.click({ selector: '[data-testid="projectsPlugin.featureMap.kanban"] >> nth=0', label: 'Kanban' });
      const feature = `[data-testid="feature-card"]:has-text("${FEATURE}")`;
      await page.locator(feature).first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT);
      await demo.click({ selector: `${feature} [data-testid="feature-card.menu"] button >> nth=0`, label: FEATURE });
      await demo.click({ selector: '[data-testid="feature-card.open"] >> nth=0', label: 'Open' });
      await demo.click({ selector: '[data-testid="feature-card.spec"] >> nth=0', label: 'Spec' });
      await page.getByTestId('spec-article.spec').first().waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(BEAT * 3);
    },
  },
  {
    name: 'Assign the parent task to the agent',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Hand the build to the assistant', subtitle: 'plugin-projects QA-6' });
      const tasks = page.locator('[data-testid="projectsPlugin.tab.tasks"]').first();
      if (!(await visible(tasks, 2_000))) {
        const crumb = `[data-testid="deck.plank"] nav[aria-label="Navigation history"] button:has-text("${PROJECT}")`;
        if (await visible(page.locator(crumb), 2_000)) {
          await demo.click({ selector: `${crumb} >> nth=0`, label: PROJECT });
        } else {
          await demo.click({ selector: PROJECT_NODE, label: PROJECT });
        }
      }
      await demo.click({ selector: '[data-testid="projectsPlugin.tab.tasks"] >> nth=0', label: 'Tasks' });
      await borrow(browserSteps, 'Select the parent task and assign it to the agent').run({ demo, page });
    },
  },
  borrow(browserSteps, 'Open the agent session'),
  {
    // The take's long stretch: the agent creates the sandbox (which mints the account token), then fetches the
    // guide, writes the plugin with its spec, installs, typechecks, builds and publishes.
    name: 'Wait for the agent to publish the plugin',
    done: parentDone,
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'The assistant builds World Clock in a Sandbox and publishes it privately',
        subtitle: 'the spec travels inside the bundle',
      });
      await demo.speed({ factor: FAST });
      const deadline = Date.now() + TWENTY_FIVE_MIN;
      while (!(await parentDone({ page }))) {
        if (Date.now() > deadline) {
          throw new Error(`"${PARENT_TASK}" was not finished within 25 minutes`);
        }
        await page.waitForTimeout(5_000);
      }
      await demo.speed({ factor: 1 });
      await page.waitForTimeout(BEAT);
    },
  },
  { ...borrow(registrySteps, 'Install World Clock from the registry'), done: installed },
  {
    name: 'Open the Clocks page',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Its Clocks page, in the space it was built from',
        subtitle: 'plugin-projects QA-6',
      });
      await demo.click({ selector: await spaceTab(page), label: 'Space' });
      const sidebar = page.getByTestId('deck.sidebar');
      await sidebar.getByText(PLUGIN_NAME, { exact: true }).first().waitFor({ state: 'visible', timeout: 15_000 });
      await demo.click({ selector: '[data-testid="deck.sidebar"] >> text="Clocks"', label: 'Clocks' });
      await page.getByTestId('worldClock.clock').first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  borrow(browserSteps, 'Add two timezones'),
  {
    // plugin-code adds the spec node once the plugin's `PluginAsset` module has contributed the bundled text, so the
    // chip is the evidence that the published build carries its spec.
    name: 'Open the spec from the registry',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Its page in the registry opens the spec it was built from' });
      await demo.click({ selector: '[data-testid="treeView.pluginRegistry"]', label: 'Plugins' });
      const registryTab = '[data-testid="pluginRegistry.registry"]';
      await page.locator(registryTab).first().waitFor({ state: 'visible', timeout: 15_000 });
      await demo.click({ selector: `${registryTab} >> nth=0`, label: 'Registry' });
      await page.locator(card(PLUGIN_NAME)).first().waitFor({ state: 'visible', timeout: 60_000 });
      await demo.click({ selector: `${card(PLUGIN_NAME)} >> text=${PLUGIN_NAME}`, label: PLUGIN_NAME });
      const chip = page.locator('text="Open Specification"').first();
      await chip.waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(BEAT);
      await demo.click({ selector: 'text="Open Specification" >> nth=0', label: 'Open Specification' });
      const spec = page.getByTestId('spec-article.spec').first();
      await spec.waitFor({ state: 'visible', timeout: 30_000 });
      await spec.getByText(FEATURE).first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT * 4);
    },
  },
];
