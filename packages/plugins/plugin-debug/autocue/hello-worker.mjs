//
// Copyright 2026 DXOS.org
//

/**
 * Hello Worker: create the space from its template, have an agent draw the Worker as a Mermaid diagram and file
 * it on the project, open the diagram, then hand the sandbox and code tasks to a second chat and watch the Gantt
 * fill in. Stops before the deploy, whose claim URL is a bearer credential the take must not show.
 *
 * @mdl packages/plugins/plugin-debug/PLUGIN.mdl test QA-9
 * @app composer-app bundled dev build, served by `vite preview` on :4173, talking to EDGE preview
 *
 *   export DX_EDGE_BASE_URL=https://preview.dxos.network/ DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   moon run composer-app:bundle
 *   pnpm exec vite preview --configLoader native --port 4173 --strictPort
 *
 * The dev environment enables plugin-debug (the template) and Sandbox; Mermaid is enabled off camera.
 */

const TEMPLATE = 'Hello Worker';
const PROJECT = 'Hello Worker';

/** The Assistant's remote model; Composer's default left delegated chats silent on EDGE preview. */
const MODEL = 'DeepSeek V4 Pro';

const DIAGRAM_TASK = 'Draw the Worker as a diagram';
const CODE_TASKS = ['Create a sandbox and install wrangler', 'Write the Worker'];

const FINISHED = ['done', 'review'];
const TWENTY_MIN = 20 * 60_000;

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
  if (await visible(close, 3_000)) {
    await close.click();
  }
};

/** The statuses of the named tasks across every open space, read from ECHO rather than the screen. */
const statuses = (page, titles) =>
  page
    .evaluate(async (titles) => {
      const result = {};
      for (const space of dxos.spaces()) {
        // A space still opening has no database to query yet.
        const tasks = await space.db
          .query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.task')))
          .run()
          .catch(() => []);
        for (const task of tasks) {
          if (titles.includes(task.title)) {
            result[task.title] = task.status;
          }
        }
      }
      return result;
    }, titles)
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
  await page.locator(TASK_ROW).nth(5).waitFor({ state: 'visible', timeout: 15_000 });
};

/** Ticks the named rows and assigns them to the agent as one chat. */
const delegate = async (demo, page, titles) => {
  for (const title of titles) {
    await demo.click({ selector: `${taskRow(title)} >> [data-testid="taskList.item.checkbox"]`, label: title });
  }
  await demo.click({ selector: '[data-testid="projectsPlugin.delegateTasks"]', label: 'Assign to agent' });
  await page.getByTestId('projectsPlugin.pipeline.chart').first().waitFor({ state: 'visible', timeout: 30_000 });
};

const caption = (demo, value) => demo.caption({ value, subtitle: 'Hello Worker template' });

export const steps = [
  {
    name: 'Prep (off camera): dismiss notices, enable Mermaid, pick the model',
    setup: true,
    run: async ({ demo, page }) => {
      const notice = page.locator(
        '[data-testid="org.dxos.plugin.observability.notice"] button:not(:has-text("Settings"))',
      );
      if (await visible(notice, 8_000)) {
        await notice.first().click();
      }

      await demo.click({ selector: '[data-testid="treeView.pluginRegistry"]', hud: false });
      const filter = page.locator('input[placeholder="Filter…"]').first();
      await filter.waitFor({ state: 'visible', timeout: 15_000 });
      await demo.fill({ selector: 'input[placeholder="Filter…"]', value: 'Mermaid', hud: false });
      // The switch's input is visually hidden; its label is what takes the click and carries the state.
      const toggle = page.locator('[data-testid="pluginList.org.dxos.plugin.mermaid"] label[data-scope="switch"]');
      await toggle.waitFor({ state: 'visible', timeout: 10_000 });
      if ((await toggle.getAttribute('data-state')) !== 'checked') {
        await toggle.click();
        await page
          .locator('[data-testid="pluginList.org.dxos.plugin.mermaid"] label[data-state="checked"]')
          .waitFor({ timeout: 10_000 });
      }
      await demo.fill({ selector: 'input[placeholder="Filter…"]', value: '', hud: false });

      // A delegated chat runs on the settings' default model, not the chat picker's.
      await demo.click({ selector: '[data-testid="treeView.appSettings"]', hud: false });
      await page.waitForURL(/dxos:settings/, { timeout: 10_000 });
      await demo.click({ selector: '[data-testid="settings.org.dxos.plugin.assistant"]', hud: false });
      await demo.click({ selector: 'role=combobox[name="Remote language model"]', hud: false });
      await demo.click({ selector: `role=option[name="${MODEL}"]`, hud: false });
      await page.locator('role=combobox[name="Remote language model"]', { hasText: MODEL }).waitFor();
      await demo.click({ selector: '[data-testid="spacePlugin.space"] >> nth=0', hud: false });
      await demo.cut();
    },
  },
  {
    name: 'Create a space from the Hello Worker template',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Hello Worker', subtitle: 'From a diagram to a Cloudflare Worker', hold: 3_600 });
      await caption(demo, 'Create a space from the Hello Worker template');
      await demo.click({ selector: '[data-testid="spacePlugin.addSpace"]', label: 'Add space' });
      await demo.click({ selector: 'role=menuitem[name="Create space"]', label: 'Create space' });
      await demo.click({
        selector: `[data-testid="create-space-dialog"] [role="option"]:has-text("${TEMPLATE}")`,
        label: TEMPLATE,
      });
      await page.waitForTimeout(BEAT);
      await demo.click({ selector: '[data-testid="create-space-dialog"] button:has-text("Create")', label: 'Create' });
      await page.getByTestId('org.dxos.type.project.section').first().waitFor({ state: 'visible', timeout: 60_000 });
      await showProject(page);
      await closeCompanion(page);
    },
  },
  {
    name: 'Open the project and its tasks',
    run: async ({ demo, page }) => {
      await caption(demo, 'Six tasks, from a diagram to a deployed Worker');
      await closeCompanion(page);
      await showProject(page);
      await demo.click({ selector: PROJECT_NODE, label: PROJECT });
      await openTasks(demo, page);
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Assign the diagram task to the agent',
    run: async ({ demo, page }) => {
      await caption(demo, 'First, the agent draws the Worker');
      await delegate(demo, page, [DIAGRAM_TASK]);
      await closeCompanion(page);
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Wait for the diagram',
    done: async ({ page }) => FINISHED.includes((await statuses(page, [DIAGRAM_TASK]))[DIAGRAM_TASK]),
    run: async ({ demo, page }) => {
      await demo.speed({ factor: FAST });
      await waitFinished(page, [DIAGRAM_TASK]);
      await demo.speed({ factor: 1 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Open the diagram from the project',
    run: async ({ demo, page }) => {
      await caption(demo, 'The diagram, filed on the project');
      await demo.click({ selector: '[data-testid="projectsPlugin.tab.overview"] >> nth=0', label: 'Overview' });
      const gallery = page.locator('[data-testid="projectsPlugin.artifacts"]').first();
      await gallery.waitFor({ state: 'visible', timeout: 15_000 });
      await gallery.scrollIntoViewIfNeeded();
      await page.waitForTimeout(BEAT);
      await demo.click({
        selector: '[data-testid="projectsPlugin.artifacts"] :is(button,a,[role="button"],[data-scope="card"]) >> nth=0',
        label: 'Diagram',
      });
      await page
        .locator(
          '[data-testid="deck.plank"] svg[id^="mermaid"], [data-testid="deck.plank"] .cm-mermaid svg, [data-testid="deck.plank"] [class*="mermaid"] svg',
        )
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(BEAT * 3);
    },
  },
  {
    name: 'Assign the sandbox and code tasks to the agent',
    run: async ({ demo, page }) => {
      await caption(demo, 'Then the code: a sandbox, and the Worker');
      await openTasks(demo, page);
      await delegate(demo, page, CODE_TASKS);
      await closeCompanion(page);
    },
  },
  {
    name: 'Watch the Gantt fill in',
    done: async ({ page }) => {
      const current = await statuses(page, CODE_TASKS);
      return CODE_TASKS.every((title) => FINISHED.includes(current[title]));
    },
    run: async ({ demo, page }) => {
      await demo.speed({ factor: FAST });
      await waitFinished(page, CODE_TASKS);
      await demo.speed({ factor: 1 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Hold on the finished Gantt',
    narration: 'The agent and the plan share one space: every task it works lands on the same Gantt the team reads.',
    run: async ({ demo, page }) => {
      await caption(demo, 'Three tasks done by the agent, each a lane on the Gantt');
      await page.getByTestId('projectsPlugin.pipeline.chart').first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(10_000);
    },
  },
];
