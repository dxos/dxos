//
// Copyright 2026 DXOS.org
//

/**
 * Hello Worker: create the space from its template, look at its partial spec and feature map, then hand the three
 * planning tasks to one chat and watch it complete the spec in Composer, draw it, file the implementation as tasks of
 * its own and work them until the deployed Worker answers. The take never opens the chat: it carries the claim URL, a
 * bearer credential for the temporary account.
 *
 * @mdl packages/plugins/plugin-debug/PLUGIN.mdl test QA-9
 * @app composer-app bundled dev build, served by `vite preview` on :4173, talking to EDGE preview
 *
 *   export DX_EDGE_BASE_URL=https://preview.dxos.network/ DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   moon run composer-app:bundle
 *   pnpm exec vite preview --configLoader native --port 4173 --strictPort
 *
 * The dev environment enables plugin-debug (the template), Code (the spec article) and Sandbox; Illustrator and Canvas
 * are on by default.
 */

const TEMPLATE = 'Hello Worker';
const PROJECT = 'Hello Worker';

/** The Assistant's remote model; Composer's default left delegated chats silent on EDGE preview. */
const MODEL = 'DeepSeek V4 Pro';

const SPEC_TASK = 'Complete the spec';
const DIAGRAM_TASK = 'Draw the proposed architecture';
const PLAN_TASK = 'Plan the implementation as tasks';
const PLANNING_TASKS = [SPEC_TASK, DIAGRAM_TASK, PLAN_TASK];

const FEATURE = 'Greeting endpoint';

const FINISHED = ['done', 'review'];
const TWENTY_MIN = 20 * 60_000;
const FORTY_MIN = 40 * 60_000;

/** Agent stretches play at this factor, with the trimmer's fast-forward badge on screen. */
const FAST = 10;

/** A beat for the viewer after a visible change. */
const BEAT = 1_500;

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
const TAKE_SPACE = '__helloWorkerSpace';

/**
 * The statuses of the named tasks in the space this take created, read from ECHO rather than the screen. Only that
 * space: a reused profile keeps earlier Hello Worker spaces whose tasks carry the same titles.
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
      return tasks.map((task) => ({ title: task.title, status: task.status, reader: task.assignee?.role === 'user' }));
    }, TAKE_SPACE)
    .catch(() => []);

/** Whether the agent has filed its implementation tasks and finished every one that is not the reader's. */
const shipped = async (page) => {
  const tasks = await allTasks(page);
  return tasks.length > PLANNING_TASKS.length && tasks.every((task) => task.reader || FINISHED.includes(task.status));
};

/** The spec's text in the take's space, read from ECHO. */
const specText = (page) =>
  page
    .evaluate(async (key) => {
      const space = dxos.spaces().find((candidate) => candidate.id === globalThis[key]);
      // The template's own spec, not the one breaking a feature down.
      const specs = space
        ? await space.db
            .query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.projects.spec')))
            .run()
            .catch(() => [])
        : [];
      const spec = specs.find((candidate) => candidate.name === 'Hello Worker');
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
    const crumb = '[data-testid="deck.plank"] nav[aria-label="Navigation history"] button:has-text("Hello Worker")';
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

export const steps = [
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
    name: 'Create a space from the Hello Worker template',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Hello Worker', subtitle: 'From a partial spec to a Cloudflare Worker', hold: 3_600 });
      await caption(demo, 'Create a space from the Hello Worker template');
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
    name: 'Watch the Worker ship',
    done: async ({ page }) => shipped(page),
    run: async ({ demo, page }) => {
      await caption(demo, 'And worked them until the Worker answered');
      await page
        .getByTestId('projectsPlugin.pipeline.chart')
        .first()
        .scrollIntoViewIfNeeded()
        .catch(() => {});
      await demo.speed({ factor: FAST });
      const deadline = Date.now() + FORTY_MIN;
      while (!(await shipped(page))) {
        if (Date.now() > deadline) {
          throw new Error(`not shipped within forty minutes: ${JSON.stringify(await allTasks(page))}`);
        }
        await page.waitForTimeout(5_000);
      }
      await demo.speed({ factor: 1 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Hold on the shipped project',
    narration: 'The spec, the diagram, the plan and the Worker it produced all live in one space.',
    run: async ({ demo, page }) => {
      await caption(demo, 'The claim is yours: it is the only task left');
      await openTasks(demo, page);
      await page.waitForTimeout(10_000);
    },
  },
];
