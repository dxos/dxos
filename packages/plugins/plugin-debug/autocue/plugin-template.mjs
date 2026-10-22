//
// Copyright 2026 DXOS.org
//

/**
 * The steps every plugin-template take shares, for a space created from one of plugin-debug's plugin templates
 * (`src/samples/plugin`): look at the partial spec and feature map, hand the three planning tasks to one chat, watch it
 * complete the spec in Composer, draw it, file the implementation as tasks of its own and work them in a sandbox on
 * EDGE until `dx registry publish --private` uploads the plugin, then install it from Plugins → Registry. Each
 * plugin's flow supplies its names and a `finale` that uses the installed plugin.
 *
 * Served as each flow's `@app` says: a composer-app production bundle built with a plugin toolchain, talking to an
 * EDGE that runs registry-service.
 */

/** EDGE dev's ai-service serves Anthropic but not DeepSeek. */
const MODEL = 'Claude Sonnet 5';

const SPEC_TASK = 'Complete the spec';
const DIAGRAM_TASK = 'Draw the proposed architecture';
const PLAN_TASK = 'Plan the implementation as tasks';
const PLANNING_TASKS = [SPEC_TASK, DIAGRAM_TASK, PLAN_TASK];

const FINISHED = ['done', 'review'];
const TWENTY_MIN = 20 * 60_000;
const SIXTY_MIN = 60 * 60_000;

/** A plugin card in the registry list, by its display name. */
export const card = (name) => `li[data-testid^="pluginList."]:has(span:text-is("${name}"))`;

/** Agent stretches play at this factor, with the trimmer's fast-forward badge on screen. */
const FAST = 10;

/** A beat for the viewer after a visible change. */
export const BEAT = 1_500;

/**
 * @param {object} options
 * @param {string} options.template The space template's label in the create-space dialog.
 * @param {string} options.project The project, spec and sandbox name.
 * @param {string} options.plugin The plugin's name in the registry, as its `dx.config.ts` names it.
 * @param {string} options.feature The first feature, whose card opens the spec.
 * @param {Array<object>} options.finale The steps that use the installed plugin.
 */
export const makeSteps = ({ template: TEMPLATE, project: PROJECT, plugin: PLUGIN_NAME, feature: FEATURE, finale }) => {
  /** The project's own row in the navtree, under Projects. */
  const PROJECT_NODE = `[data-testid="deck.sidebar"] [data-testid="spacePlugin.object"]:has(:text-is("${PROJECT}")) >> nth=0`;

  /**
   * Expands Projects until the project's row shows. A space that has just been created re-renders its tree a few
   * times while its content loads, which can close a branch opened too early, so this checks the outcome, not the click.
   */
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

  const TASK_ROW = '[data-testid="deck.plank"] [data-testid="taskList.item"]';
  const taskRow = (title) => `${TASK_ROW}:has([data-testid="taskList.item.title"]:text-is("${title}"))`;

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
    // With help panels hidden the button can stay in the DOM with nothing to close, so a click that cannot land is fine.
    if (await visible(close, 3_000)) {
      await close.click({ timeout: 2_000 }).catch(() => {});
    }
  };

  /** Where the take's own space id is kept in the page, so a replay that reuses the page still finds it. */
  const TAKE_SPACE = `__pluginTemplateSpace.${PROJECT}`;

  /**
   * The statuses of the named tasks in the space this take created, read from ECHO rather than the screen. Only that
   * space: a reused profile keeps earlier spaces from the same template whose tasks carry the same titles.
   */
  const statuses = (page, titles) =>
    page
      .evaluate(
        async ({ titles, key }) => {
          const space = dxos.spaces().find((candidate) => candidate.id === globalThis[key]);
          // A space still opening has no database to query yet.
          const tasks = space
            ? await space.db
                .query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.task')))
                .run()
                .catch(() => [])
            : [];
          return Object.fromEntries(
            tasks.filter((task) => titles.includes(task.title)).map((task) => [task.title, task.status]),
          );
        },
        { titles, key: TAKE_SPACE },
      )
      .catch(() => ({}));

  /** Polls until every named task is finished. */
  const waitFinished = async (page, titles) => {
    const deadline = Date.now() + TWENTY_MIN;
    for (;;) {
      const current = await statuses(page, titles);
      if (titles.every((title) => FINISHED.includes(current[title]))) {
        return;
      }
      if (Date.now() > deadline) {
        throw new Error(`not finished within twenty minutes: ${JSON.stringify(current)}`);
      }
      await page.waitForTimeout(3_000);
    }
  };

  /**
   * Every task in the take's space with its status and whether it is the reader's, read from ECHO. The agent's own
   * implementation tasks are not known ahead, so the take waits on all of them.
   */
  const allTasks = (page) =>
    page
      .evaluate(async (key) => {
        const space = dxos.spaces().find((candidate) => candidate.id === globalThis[key]);
        const tasks = space
          ? await space.db
              .query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.task')))
              .run()
              .catch(() => [])
          : [];
        return tasks.map((task) => ({
          title: task.title,
          status: task.status,
          reader: task.assignee?.role === 'user',
        }));
      }, TAKE_SPACE)
      .catch(() => []);

  /**
   * Whether the agent has finished a publish task it filed. Keyed on the publish rather than on every task: the
   * reader's install stays open by design, however the agent assigns it, and a chat can file working notes as tasks.
   */
  const published = async (page) =>
    (await allTasks(page)).some((task) => /publish/i.test(task.title) && FINISHED.includes(task.status));

  /** The spec's text in the take's space, read from ECHO. */
  const specText = (page) =>
    page
      .evaluate(async (key) => {
        const space = dxos.spaces().find((candidate) => candidate.id === globalThis[key]);
        const [spec] = space
          ? await space.db
              .query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.spec')))
              .run()
              .catch(() => [])
          : [];
        const text = await spec?.content?.load?.();
        return text?.content ?? '';
      }, TAKE_SPACE)
      .catch(() => '');

  /** Opens the feature's spec from its article, which opens the Spec object in the deck. */
  const openSpec = async (demo, page) => {
    await demo.click({ selector: '[data-testid="projectsPlugin.tab.features"] >> nth=0', label: 'Features' });
    await demo.click({ selector: '[data-testid="projectsPlugin.featureMap.kanban"] >> nth=0', label: 'Kanban' });
    const card = page.locator(`[data-testid="feature-card"]:has-text("${FEATURE}")`).first();
    await card.waitFor({ state: 'visible', timeout: 15_000 });
    await demo.click({
      selector: `[data-testid="feature-card"]:has-text("${FEATURE}") [data-testid="feature-card.menu"] button >> nth=0`,
      label: FEATURE,
    });
    await demo.click({ selector: '[data-testid="feature-card.open"] >> nth=0', label: 'Open' });
    await demo.click({ selector: '[data-testid="feature-card.spec"] >> nth=0', label: 'Spec' });
    await page.getByTestId('spec-article.spec').first().waitFor({ state: 'visible', timeout: 30_000 });
  };

  /** Back to the project's Tasks tab, through the plank's breadcrumb when an artifact holds the plank. */
  const openTasks = async (demo, page) => {
    const tasks = page.locator('[data-testid="projectsPlugin.tab.tasks"]').first();
    if (!(await visible(tasks, 2_000))) {
      const crumb = `[data-testid="deck.plank"] nav[aria-label="Navigation history"] button:has-text("${PROJECT}")`;
      if (await visible(page.locator(crumb), 2_000)) {
        await demo.click({ selector: `${crumb} >> nth=0`, label: PROJECT });
      } else {
        await demo.click({ selector: PROJECT_NODE, label: PROJECT });
      }
    }
    await tasks.waitFor({ timeout: 15_000 });
    await demo.click({ selector: '[data-testid="projectsPlugin.tab.tasks"] >> nth=0', label: 'Tasks' });
    await page
      .locator(TASK_ROW)
      .nth(PLANNING_TASKS.length - 1)
      .waitFor({ state: 'visible', timeout: 15_000 });
  };

  /** Ticks the named rows and assigns them to the agent as one chat. */
  const delegate = async (demo, page, titles) => {
    for (const title of titles) {
      await demo.click({ selector: `${taskRow(title)} >> [data-testid="taskList.item.checkbox"]`, label: title });
    }
    await demo.click({ selector: '[data-testid="projectsPlugin.delegateTasks"]', label: 'Assign to agent' });
    await page.getByTestId('projectsPlugin.pipeline.chart').first().waitFor({ state: 'visible', timeout: 30_000 });
  };

  // One line, as a Final Cut Pro caption reads; the take's title already names the template.
  const caption = (demo, value) => demo.caption({ value });

  return [
    {
      name: 'Prep (off camera): dismiss notices, pick the model',
      setup: true,
      run: async ({ demo, page }) => {
        const notice = page.locator(
          '[data-testid="org.dxos.plugin.observability.notice"] button:not(:has-text("Settings"))',
        );
        if (await visible(notice, 8_000)) {
          await notice.first().click();
        }

        // Publishing and the sandbox's token need an account bound to this identity; a fresh profile has none, and the
        // `test+*@dxos.org` hatch (open on dev and preview, as the assistant evals use it) binds one.
        const bound = await page.evaluate(async () => {
          const identity = dxos.client.halo.identity.get();
          const key = Array.from(identity.identityKey.data, (byte) => byte.toString(16).padStart(2, '0')).join('');
          const response = await fetch(
            new URL('/hub/account/login', dxos.client.config.values.runtime.services.edge.url),
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: `test+autocue-${key.slice(0, 12)}@dxos.org`,
                identityDid: identity.did,
                identityKey: key,
              }),
            },
          );
          return response.ok && (await response.json()).admitted === true;
        });
        if (!bound) {
          throw new Error('the test-account hatch did not admit this identity; it is open on dev and preview only');
        }

        // A delegated chat runs on the settings' default model, not the chat picker's.
        await demo.click({ selector: '[data-testid="treeView.appSettings"]', hud: false });
        await page.waitForURL(/dxos:settings/, { timeout: 10_000 });
        // Help panels open beside each new space a beat after it renders, too late to close before the camera sees them.
        await demo.click({ selector: '[data-testid="settings.org.dxos.plugin.support"]', hud: false });
        const hideHelp = page.getByRole('switch', { name: 'Hide help panels' });
        await hideHelp.waitFor({ state: 'attached', timeout: 10_000 });
        if (!(await hideHelp.isChecked())) {
          // The input is visually hidden; its switch label takes the click.
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
        // The Help companion opens on first run, and its tour video cannot load in every environment.
        await closeCompanion(page);
        await demo.cut();
      },
    },
    {
      name: `Create a space from the ${TEMPLATE} template`,
      run: async ({ demo, page }) => {
        await demo.title({
          value: TEMPLATE,
          subtitle: 'From a partial spec to a plugin in your registry',
          hold: 3_600,
        });
        await caption(demo, `Create a space from the ${TEMPLATE} template`);
        await demo.click({ selector: '[data-testid="spacePlugin.addSpace"]', label: 'Add space' });
        await demo.click({ selector: 'role=menuitem[name="Create space"]', label: 'Create space' });
        // The first click can land while the dialog is still settling and select nothing; selecting a template names
        // the space after it, so the name field is the proof the click took.
        const name = page.locator('[data-testid="create-space-dialog"] input').first();
        for (let attempt = 0; (await name.inputValue()) !== TEMPLATE; attempt++) {
          if (attempt === 3) {
            throw new Error(`the "${TEMPLATE}" template did not select`);
          }
          await demo.click({
            selector: `[data-testid="create-space-dialog"] [role="option"]:has-text("${TEMPLATE}")`,
            label: TEMPLATE,
          });
          await page.waitForTimeout(BEAT / 2);
        }
        await page.waitForTimeout(BEAT);
        const before = await page.evaluate(() => dxos.spaces().map((space) => space.id));
        await demo.click({
          selector: '[data-testid="create-space-dialog"] button:has-text("Create")',
          label: 'Create',
        });
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
        await closeCompanion(page);
      },
    },
    {
      name: 'Open the project and its tasks',
      run: async ({ demo, page }) => {
        await caption(demo, 'Three tasks: finish the spec, draw it, plan the work');
        await closeCompanion(page);
        await showProject(page);
        await demo.click({ selector: PROJECT_NODE, label: PROJECT });
        await openTasks(demo, page);
        await page.waitForTimeout(BEAT * 2);
      },
    },
    {
      name: 'Open the feature map and the spec',
      run: async ({ demo, page }) => {
        await caption(demo, 'Four features, and a spec that states only the first');
        await openSpec(demo, page);
        await page.waitForTimeout(BEAT * 3);
      },
    },
    {
      name: 'Assign the planning tasks to the agent',
      run: async ({ demo, page }) => {
        await caption(demo, 'One chat takes all three');
        await openTasks(demo, page);
        await delegate(demo, page, PLANNING_TASKS);
        await closeCompanion(page);
        await page.waitForTimeout(BEAT);
      },
    },
    {
      name: 'Watch the spec fill in',
      done: async ({ page }) => FINISHED.includes((await statuses(page, [SPEC_TASK]))[SPEC_TASK]),
      run: async ({ demo, page }) => {
        await demo.speed({ factor: FAST });
        await waitFinished(page, [SPEC_TASK]);
        await demo.speed({ factor: 1 });
        const text = await specText(page);
        if (!['F-2', 'F-3', 'F-4'].every((id) => text.includes(`feat ${id}`))) {
          throw new Error('the spec task finished without a feat block for each of F-2 to F-4');
        }
        await caption(demo, 'The agent wrote the rest of the spec');
        await openSpec(demo, page);
        await page.waitForTimeout(BEAT * 3);
      },
    },
    {
      name: 'Open the diagram from the project',
      done: async ({ page }) => FINISHED.includes((await statuses(page, [DIAGRAM_TASK]))[DIAGRAM_TASK]),
      run: async ({ demo, page }) => {
        await demo.speed({ factor: FAST });
        await waitFinished(page, [DIAGRAM_TASK]);
        await demo.speed({ factor: 1 });
        await caption(demo, 'Then drew it, and filed the diagram on the project');
        await openTasks(demo, page);
        // Filing an artifact can open it in the project's plank by itself, which hides the project's tabs.
        const overview = page.locator('[data-testid="projectsPlugin.tab.overview"]').first();
        if (await visible(overview, 2_000)) {
          await demo.click({ selector: '[data-testid="projectsPlugin.tab.overview"] >> nth=0', label: 'Overview' });
          const gallery = page.locator('[data-testid="projectsPlugin.artifacts"]').first();
          await gallery.waitFor({ state: 'visible', timeout: 15_000 });
          await gallery.scrollIntoViewIfNeeded();
          await page.waitForTimeout(BEAT);
          await demo.click({
            selector:
              '[data-testid="projectsPlugin.artifacts"] :is(button,a,[role="button"],[data-scope="card"]) >> nth=0',
            label: 'Diagram',
          });
        }
        // The drawing opens in the project's plank, under its breadcrumb, once its canvas has laid out.
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
      name: 'Watch the plan become tasks',
      done: async ({ page }) => FINISHED.includes((await statuses(page, [PLAN_TASK]))[PLAN_TASK]),
      run: async ({ demo, page }) => {
        await caption(demo, 'Then planned the implementation as tasks of its own');
        await openTasks(demo, page);
        await demo.speed({ factor: FAST });
        // The plan task stays open while the agent works the tasks it filed, so waiting on new rows is the cue.
        await page.locator(TASK_ROW).nth(PLANNING_TASKS.length).waitFor({ state: 'visible', timeout: TWENTY_MIN });
        await demo.speed({ factor: 1 });
        await page.waitForTimeout(BEAT * 2);
      },
    },
    {
      name: 'Watch the plugin publish',
      done: async ({ page }) => published(page),
      run: async ({ demo, page }) => {
        await caption(demo, 'And worked them until the plugin was in your registry');
        await page
          .getByTestId('projectsPlugin.pipeline.chart')
          .first()
          .scrollIntoViewIfNeeded()
          .catch(() => {});
        await demo.speed({ factor: FAST });
        const deadline = Date.now() + SIXTY_MIN;
        while (!(await published(page))) {
          if (Date.now() > deadline) {
            throw new Error(`not published within an hour: ${JSON.stringify(await allTasks(page))}`);
          }
          await page.waitForTimeout(5_000);
        }
        await demo.speed({ factor: 1 });
        await page.waitForTimeout(BEAT * 2);
      },
    },
    {
      // Nothing was loaded by URL: the private registry lists the plugin, and installing it (which also enables it) is
      // the reader's click.
      name: `Install ${PLUGIN_NAME} from the registry`,
      done: ({ page }) =>
        page.evaluate((name) => composer.plugins().some((plugin) => plugin.name === name), PLUGIN_NAME),
      run: async ({ demo, page }) => {
        await caption(demo, `${PLUGIN_NAME} is in Plugins → Registry: install it`);
        await closeCompanion(page);
        await demo.click({ selector: '[data-testid="treeView.pluginRegistry"]', label: 'Plugins' });
        const registryTab = '[data-testid="pluginRegistry.registry"]';
        await page.locator(registryTab).first().waitFor({ state: 'visible', timeout: 15_000 });
        await demo.click({ selector: `${registryTab} >> nth=0`, label: 'Registry' });
        const plugin = page.locator(card(PLUGIN_NAME)).first();
        await plugin.waitFor({ state: 'visible', timeout: 60_000 });
        await plugin.scrollIntoViewIfNeeded();
        await demo.hover({ selector: `${card(PLUGIN_NAME)} >> nth=0`, label: PLUGIN_NAME });
        await page.waitForTimeout(BEAT);
        await demo.click({ selector: `${card(PLUGIN_NAME)} >> nth=0 >> button:has-text("Install")`, label: 'Install' });
        await page.waitForFunction((name) => composer.plugins().some((plugin) => plugin.name === name), PLUGIN_NAME, {
          timeout: 60_000,
        });
        await page.waitForTimeout(BEAT);
      },
    },
    ...finale,
  ];
};
