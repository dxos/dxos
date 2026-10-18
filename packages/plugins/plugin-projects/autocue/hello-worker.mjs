//
// Copyright 2026 DXOS.org
//

/**
 * Create a space from the Hello Worker template, brief its project's agent to diagram the Worker and then write
 * its code (running nothing), hand it those two tasks, and watch the project's Gantt chart fill as it works.
 *
 * @mdl packages/plugins/plugin-projects/PLUGIN.mdl test QA-5
 * @app composer-app bundled dev build, served by `vite preview` on :4173, talking to EDGE preview
 *
 *   export DX_EDGE_BASE_URL=https://preview.dxos.network/ DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   moon run composer-app:bundle
 *   pnpm exec vite preview --configLoader native --port 4173 --strictPort
 *
 * Every take starts on a fresh profile (record mode opens a new browser context), so nothing needs clearing.
 * `autocue/hello-worker.sh` records the three cuts: light and dark with no ident or captions, and dark with both.
 */

/** A beat for the viewer after a visible change. */
const BEAT = 1_200;

/** How long the finished chart and each artifact stay on screen. */
const LINGER = 3_000;

/** The agent's whole run, diagram and code; it runs nothing, so this is generous. */
const AGENT_TIMEOUT = 15 * 60_000;

/** The Assistant's remote model; Composer's default left delegated chats silent (see plugin-computer's flow). */
const MODEL = 'DeepSeek V4 Pro';

const SPACE = 'Hello Worker';
const PROJECT = 'Hello Worker';

/** Debug contributes the Hello Worker template; Mermaid renders the agent's diagram. */
const PLUGINS = ['org.dxos.plugin.debug', 'org.dxos.plugin.mermaid'];

/** Added on camera, ahead of the template's own "Write the Worker". */
const DIAGRAM_TASK = 'Draw the Worker as a diagram';
const CODE_TASK = 'Write the Worker';

/** Appended to the template's instructions; it overrides the sandbox and deploy steps for this run. */
const BRIEF =
  'For this run: first draw the Worker as a Mermaid diagram in a document and file it on the project. ' +
  "Then write the Worker's TypeScript in a second document and file that too. " +
  'Create no sandbox and run or deploy nothing.';

/** Statuses that mean a task is finished: an agent may leave it for review rather than done. */
const FINISHED = ['done', 'review'];

const PLANK = '[data-testid="deck.plank"]';
const PROJECT_PLANK = `${PLANK}[data-attendable-id*="/org.dxos.type.project/"]`;
const INSTRUCTIONS = `${PROJECT_PLANK} .cm-content:has-text("Deploy the Worker described")`;
const ADD_TASK = `${PROJECT_PLANK} input[placeholder="Add task"]`;
const TASK_ROW = (title) => `${PROJECT_PLANK} [data-testid="taskList.item"]:has-text("${title}")`;
const CHART = '[data-testid="projectsPlugin.pipeline.chart"]';
const ARTIFACTS = `${PROJECT_PLANK} [data-testid="projectsPlugin.artifacts"]`;
const SPACE_TITLE = `text="${SPACE}" >> visible=true`;

/** A navtree branch row by its own heading; a parent's text includes its children's, so the heading is matched. */
const BRANCH = (label) =>
  `[data-scope="tree-view"][data-part="branch-control"]:visible:has(> [data-testid="treeItem.heading"]:text-is("${label}"))`;

const visible = (locator, timeout) =>
  locator
    .first()
    .waitFor({ state: 'visible', timeout })
    .then(
      () => true,
      () => false,
    );

/** Types as a person would, a character at a time. */
const typeSlowly = (page, text, delay = 35) => page.keyboard.type(text, { delay });

/**
 * Finds this take's project, its two tasks and its artifacts, in whichever space holds a project of that name.
 * A fresh profile has exactly one, in the space the template made.
 */
const readProject = (page) =>
  page.evaluate(
    async ({ name, titles }) => {
      const tabs = [...document.querySelectorAll('[data-testid="spacePlugin.space"]')];
      for (const tab of tabs) {
        const spaceId = tab.dataset.value?.split('/').pop();
        if (!spaceId) {
          continue;
        }
        const projects = await dxos
          .spaces(spaceId)
          .db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.project')))
          .run();
        const project = projects.find((candidate) => candidate.name === name);
        if (!project) {
          continue;
        }
        const taskSet = await project.taskSet?.load();
        const tasks = await Promise.all((taskSet?.tasks ?? []).map((ref) => ref.load()));
        const artifacts = await Promise.all((project.artifacts ?? []).map((ref) => ref.load().catch(() => undefined)));
        return {
          spaceId,
          id: project.id,
          tasks: tasks.filter((task) => titles.includes(task?.title)).map(({ title, status }) => ({ title, status })),
          artifacts: artifacts.filter(Boolean).map((artifact) => artifact.name ?? artifact.title ?? ''),
        };
      }
      return undefined;
    },
    { name: PROJECT, titles: [DIAGRAM_TASK, CODE_TASK] },
  );

/** Opens the deck's companion on its Assistant tab if it is not already showing. */
const showAssistant = async (demo, page) => {
  const tab = page.locator('[data-testid="deck.companion"] >> role=tab[name="Assistant"]').first();
  if (!(await visible(tab, 5_000))) {
    await demo.click({ selector: `${PROJECT_PLANK} [data-testid="plankHeading.companion"]`, label: 'Open companion' });
    await tab.waitFor({ state: 'visible', timeout: 10_000 });
  }
  if ((await tab.getAttribute('aria-selected')) !== 'true') {
    await demo.click({ selector: '[data-testid="deck.companion"] >> role=tab[name="Assistant"]', label: 'Assistant' });
  }
};

export const steps = [
  {
    name: 'Prep (off camera): dismiss notices, enable Debug and Mermaid, pick the model',
    setup: true,
    run: async ({ demo, page }) => {
      const notice = page.locator(
        '[data-testid="org.dxos.plugin.observability.notice"] button:not(:has-text("Settings"))',
      );
      if (await visible(notice, 8_000)) {
        await notice.first().click();
      }
      await page.waitForFunction(() => globalThis.composer?.invoke, undefined, { timeout: 60_000 });
      await page.evaluate((ids) => composer.invoke('org.dxos.operation.registry.enablePlugins', { ids }), PLUGINS);

      // A delegated chat runs on the settings' default model, not the chat picker's.
      await demo.click({ selector: '[data-testid="treeView.appSettings"]', hud: false });
      await page.waitForURL(/dxos:settings/, { timeout: 10_000 });
      await demo.click({ selector: '[data-testid="settings.org.dxos.plugin.assistant"]', hud: false });
      const model = 'role=combobox[name="Remote language model"]';
      await page.locator(model).first().waitFor({ state: 'visible', timeout: 10_000 });
      await demo.click({ selector: model, hud: false });
      await demo.click({ selector: `role=option[name="${MODEL}"]`, hud: false });
      await page.locator(model, { hasText: MODEL }).first().waitFor();

      // The take opens on the default space's Home.
      await demo.click({ selector: '[data-testid="spacePlugin.space"] >> nth=0', hud: false });
      await page.locator(`${PLANK}[data-attendable-id$="/home"]`).first().waitFor({ timeout: 15_000 });
      const close = page.locator('role=button[name="Close companion"]').first();
      if (await close.isVisible().catch(() => false)) {
        await close.click();
      }
    },
  },
  {
    name: 'Create the Hello Worker space',
    caption: 'Create a space from the Hello Worker template',
    done: async ({ page }) => (await readProject(page)) !== undefined,
    run: async ({ demo, page }) => {
      await demo.click({ selector: 'role=button[name="App menu"]', label: 'App menu' });
      await demo.click({ selector: '[data-testid="spacePlugin.createSpace"]', label: 'Create space' });
      await demo.click({
        selector: `[data-testid="create-space-dialog"] [role="option"]:has-text("${SPACE}")`,
        label: SPACE,
      });
      await page.waitForTimeout(BEAT / 2);
      await demo.click({ selector: '[data-testid="create-space-dialog"] button:has-text("Create")', label: 'Create' });
      await page.locator(SPACE_TITLE).first().waitFor({ timeout: 30_000 });
      await page.locator(BRANCH('Projects')).first().waitFor({ timeout: 30_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Open the project',
    caption: 'The template seeds one project: five tasks to deploy a Worker',
    run: async ({ demo, page }) => {
      const row = BRANCH('Projects');
      if ((await page.locator(row).first().getAttribute('data-state')) !== 'open') {
        await demo.click({ selector: `${row} > div >> nth=0`, label: 'Projects' });
      }
      // The project, its task set and its instructions all carry the template's name; the tree row is matched by id.
      const project = await readProject(page);
      await demo.click({
        selector: `[data-scope="tree-view"] [data-object-id$="${project.id}"] [data-testid="treeItem.heading"] >> nth=0`,
        label: PROJECT,
      });
      await page.locator(INSTRUCTIONS).first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Brief the agent',
    caption: 'Brief the agent: diagram first, then the code, and run nothing',
    run: async ({ demo, page }) => {
      await demo.click({ selector: INSTRUCTIONS, label: 'Instructions' });
      await page.keyboard.press('ControlOrMeta+End');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await typeSlowly(page, BRIEF);
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Add a diagram task',
    caption: `Add a task: "${DIAGRAM_TASK}"`,
    done: async ({ page }) => (await page.locator(TASK_ROW(DIAGRAM_TASK)).count()) > 0,
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="projectsPlugin.tab.tasks"] >> nth=0', label: 'Tasks' });
      await page.locator(ADD_TASK).first().waitFor({ state: 'visible', timeout: 10_000 });
      await demo.click({ selector: ADD_TASK, label: 'Add task' });
      await typeSlowly(page, DIAGRAM_TASK, 50);
      await page.keyboard.press('Enter');
      await page.locator(TASK_ROW(DIAGRAM_TASK)).first().waitFor({ timeout: 10_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Hand the agent the diagram and the code',
    caption: 'Assign both tasks to the agent',
    run: async ({ demo, page }) => {
      for (const title of [DIAGRAM_TASK, CODE_TASK]) {
        await demo.click({
          selector: `${TASK_ROW(title)} >> nth=0 >> [data-testid="taskList.item.checkbox"]`,
          label: 'Select task',
        });
      }
      await demo.click({
        selector: `${PROJECT_PLANK} [data-testid="projectsPlugin.delegateTasks"]`,
        label: 'Assign selected tasks to agent',
      });
      // The chart can be toggled off by the take's layout; the point of the demo is to have it open.
      if (!(await visible(page.locator(CHART), 15_000))) {
        await demo.click({ selector: `${PROJECT_PLANK} [data-testid="projectsPlugin.pipeline"]`, label: 'Pipeline' });
        await page.locator(CHART).first().waitFor({ state: 'visible', timeout: 10_000 });
      }
      await showAssistant(demo, page);
      await page.getByTestId('assistant.chat-status').first().waitFor({ state: 'visible', timeout: 30_000 });
    },
  },
  {
    name: 'Watch the pipeline fill',
    caption: 'The Gantt chart fills as the agent works each task',
    run: async ({ demo, page }) => {
      // The wait is mostly the model thinking and streaming; the cut plays it fast and badges it as skipped.
      await page.waitForTimeout(LINGER);
      await demo.speed({ factor: 10 });
      const deadline = Date.now() + AGENT_TIMEOUT;
      for (;;) {
        const project = await readProject(page).catch(() => undefined);
        const finished =
          project?.tasks.length === 2 && project.tasks.every((task) => FINISHED.includes(task.status));
        if (finished && project.artifacts.length >= 2) {
          break;
        }
        if (Date.now() > deadline) {
          throw new Error(`the agent did not finish both tasks in time: ${JSON.stringify(project)}`);
        }
        await page.waitForTimeout(2_000);
      }
      await demo.speed({ factor: 1 });
      await page.waitForTimeout(LINGER);
    },
  },
  {
    name: 'Show the diagram',
    caption: 'The agent filed a diagram on the project',
    run: async ({ demo, page }) => {
      await demo.click({ selector: `${PROJECT_PLANK} [data-testid="projectsPlugin.tab.overview"]`, label: 'Overview' });
      await page.locator(ARTIFACTS).first().waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(BEAT);
      const { artifacts } = await readProject(page);
      await demo.click({ selector: `${ARTIFACTS} >> text="${artifacts[0]}" >> nth=0`, label: artifacts[0] });
      await page.locator(`${PLANK} svg[id^="mermaid"], ${PLANK} .mermaid svg`).first().waitFor({ timeout: 15_000 });
      await page.waitForTimeout(LINGER);
    },
  },
  {
    name: 'Show the code',
    caption: "…then wrote the Worker's code beside it",
    run: async ({ demo, page }) => {
      const { artifacts } = await readProject(page);
      await demo.click({ selector: `${ARTIFACTS} >> text="${artifacts[1]}" >> nth=0`, label: artifacts[1] });
      await page.locator(`${PLANK}:has-text("fetch")`).first().waitFor({ timeout: 15_000 });
      await page.waitForTimeout(LINGER);
    },
  },
  {
    name: 'Close on the filled chart',
    caption: 'Every session and task lane, kept with the project in your space',
    run: async ({ demo, page }) => {
      await demo.click({ selector: `${PROJECT_PLANK} [data-testid="projectsPlugin.tab.tasks"]`, label: 'Tasks' });
      await page.locator(CHART).first().waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(LINGER * 3);
    },
  },
];
