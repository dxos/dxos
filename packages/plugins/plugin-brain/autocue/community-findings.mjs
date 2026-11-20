//
// Copyright 2026 DXOS.org
//

/**
 * A project that asks a community's memory five questions. In a new space, the take creates a project from the
 * Community Findings template: tasks that each name the artifact their answer goes in — four sheets with charts, a
 * docs-gap brief — and a deck that presents them. It imports sixty days of the Cloudflare Developers Discord into the
 * space's memory, hands every task to the agent at once, and opens what came back: each task with its artifact
 * attached, each sheet with its chart, then the deck. The agent's stretch plays fast-forwarded.
 *
 * @title Findings as tasks, from memory
 * @mdl packages/plugins/plugin-brain/PLUGIN.mdl test QA-3
 * @app composer-app dev server on :4173 (`DX_DEV=true DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run
 *   composer-app:serve -- --port 4173`), with the TriG written by
 *   `moon run plugin-discord:facts -- trig <out.trig> --facts <cloudflare-60d facts.db>` at `$MEMORY_TRIG`
 *   (default `~/.local/share/dxos/discord-pipeline/cloudflare-60d/facts.trig`)
 * @driver `--caption-position top`
 */

import { homedir } from 'node:os';
import { join } from 'node:path';

const TRIG = process.env.MEMORY_TRIG ?? join(homedir(), '.local/share/dxos/discord-pipeline/cloudflare-60d/facts.trig');
const SPACE = 'Cloudflare community';
/** The project template, contributed by plugin-brain. */
const TEMPLATE = 'org.dxos.project.communityFindings';
const PROJECT = 'Cloudflare community';
const BRAIN = 'org.dxos.plugin.brain';

/** Kept in step with `src/templates/community-findings.ts`; flow scripts take no imports. */
const TASKS = [
  { title: 'Chart the questions by product', artifact: 'org.dxos.type.sheet' },
  { title: 'Chart the question volume by week', artifact: 'org.dxos.type.sheet' },
  { title: 'Chart what members build with', artifact: 'org.dxos.type.sheet' },
  { title: 'Chart the recurring problems', artifact: 'org.dxos.type.sheet' },
  { title: 'Write the docs-gap brief', artifact: 'org.dxos.type.document' },
  { title: 'Present the findings', artifact: 'org.dxos.type.presentation' },
];

/** A beat for the viewer after a visible change. */
const BEAT = 1_500;
const FAST = 12;

const PLANK = '[data-testid="deck.plank"]';
const TASK_ROW = `${PLANK} [data-testid="taskList.item"]`;
const taskRow = (title) => `${TASK_ROW}:has([data-testid="taskList.item.title"]:text-is("${title}"))`;
const PROJECT_NODE = `[data-testid="deck.sidebar"] [data-testid="spacePlugin.object"]:has(:text-is("${PROJECT}")) >> nth=0`;
/** A control of the Memory panel in the context sidebar. */
const MEMORY = (testId) => `[data-testid="brain.memory.${testId}"]`;

/** Where the take's own space id is kept in the page, so a replay that reuses the page still finds it. */
const TAKE_SPACE = '__communityFindingsSpace';

const visible = (locator, timeout) =>
  locator
    .first()
    .waitFor({ state: 'visible', timeout })
    .then(
      () => true,
      () => false,
    );

/** Invokes an operation once the app has booted far enough to serve it, retrying while it registers. */
const invokeWhenReady = async (page, key, input) => {
  await page.waitForFunction(() => globalThis.composer?.invoke, undefined, { timeout: 300_000 });
  for (let attempt = 0; ; attempt++) {
    try {
      return await page.evaluate(({ key, input }) => globalThis.composer.invoke(key, input), { key, input });
    } catch (error) {
      if (attempt > 90) {
        throw error;
      }
      await page.waitForTimeout(1_000);
    }
  }
};

/**
 * Each task of the take's space, by title: its status and the typenames of the artifacts filed on it, read from ECHO.
 */
const taskState = (page) =>
  page
    .evaluate(async (key) => {
      const space = dxos.spaces().find((candidate) => candidate.id === globalThis[key]);
      if (!space) {
        return {};
      }
      const tasks = await space.db
        .query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.task')))
        .run()
        .catch(() => []);
      const entries = await Promise.all(
        tasks.map(async (task) => {
          const artifacts = await Promise.all((task.artifacts ?? []).map((ref) => ref.load().catch(() => undefined)));
          return [
            task.title,
            {
              status: task.status,
              artifacts: artifacts.filter(Boolean).map((object) => ({
                typename: dxos.Obj.getTypename(object),
                name: object.name ?? object.title ?? '',
              })),
            },
          ];
        }),
      );
      return Object.fromEntries(entries);
    }, TAKE_SPACE)
    .catch(() => ({}));

/** A task is finished once it is in review (or done) and carries an artifact of the type it asked for. */
const finished = (state, { title, artifact }) =>
  ['review', 'done'].includes(state[title]?.status) &&
  (state[title]?.artifacts ?? []).some((object) => object.typename === artifact);

/** Closes the companion if one is open, so the plank gets the full width. */
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

/** Opens the project on its Tasks tab, stepping back from an artifact the plank may be showing. */
const openTasks = async (demo, page) => {
  await demo.click({ selector: PROJECT_NODE, label: PROJECT });
  const tab = page.locator('[data-testid="projectsPlugin.tab.tasks"]').first();
  if (!(await visible(tab, 3_000))) {
    await demo.click({ selector: `${PLANK} :text-is("${PROJECT}") >> nth=0`, label: PROJECT });
  }
  await tab.waitFor({ state: 'visible', timeout: 15_000 });
  await demo.click({ selector: '[data-testid="projectsPlugin.tab.tasks"] >> nth=0', label: 'Tasks' });
  await page.locator(taskRow(TASKS[0].title)).first().waitFor({ state: 'visible', timeout: 15_000 });
};

/** Opens a task's detail by its title and waits for the artifacts it carries. */
const openTask = async (demo, page, title) => {
  await demo.click({ selector: `${taskRow(title)} [data-testid="taskList.item.title"]`, label: title });
  await page.locator('[data-testid="tasksPlugin.artifacts"]').first().waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(BEAT);
};

/** Opens the task's artifact from its detail, and, for a sheet, shows its chart in the Charts companion. */
const openArtifact = async (demo, page, { title, artifact }) => {
  const state = await taskState(page);
  const { name } = state[title].artifacts.find((object) => object.typename === artifact);
  await demo.caption({ value: name, subtitle: title });
  await demo.click({
    selector: `[data-testid="tasksPlugin.artifacts"] [data-scope="card"]:has-text(${JSON.stringify(name)}) >> nth=0`,
    label: name,
  });
  if (artifact === 'org.dxos.type.sheet') {
    await page.locator('.dx-grid').first().waitFor({ state: 'visible', timeout: 20_000 });
    const tab = page.locator('[data-testid="deck.companion.tab.charts"]');
    if (!(await tab.isVisible().catch(() => false))) {
      await demo.click({ selector: '[data-testid="plankHeading.companion"] >> nth=0', label: 'Open companion' });
    }
    await demo.click({ selector: '[data-testid="deck.companion.tab.charts"]', label: 'Charts' });
    await page.locator('[data-testid="deck.companion"] svg').first().waitFor({ state: 'visible', timeout: 15_000 });
  }
  await page.waitForTimeout(BEAT * 3);
};

export const steps = [
  {
    name: 'Prep (off camera): enable Brain, dismiss notices, hide help panels',
    setup: true,
    run: async ({ demo, page }) => {
      // A cold dev server transforms modules on first request, so the sidebar can take minutes.
      await page
        .locator('[data-testid="treeView.appSettings"]')
        .first()
        .waitFor({ state: 'visible', timeout: 300_000 });
      await invokeWhenReady(page, 'org.dxos.operation.registry.enablePlugins', { ids: [BRAIN] });
      await page.waitForFunction((id) => globalThis.composer.manager.getEnabled().includes(id), BRAIN, {
        timeout: 30_000,
      });
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
    name: 'Create a space',
    done: async ({ page }) => page.evaluate((key) => !!globalThis[key], TAKE_SPACE),
    run: async ({ demo, page }) => {
      await demo.title({
        value: 'Findings as tasks',
        subtitle: 'A project the agent works from the space memory',
        hold: 3_200,
      });
      await demo.caption({ value: 'A new space for the community' });
      await demo.click({ selector: '[data-testid="spacePlugin.addSpace"]', label: 'Add space' });
      await demo.click({ selector: 'role=menuitem[name="Create space"]', label: 'Create space' });
      await demo.type({ selector: '[data-testid="create-space-dialog"] input >> nth=0', value: SPACE, label: 'Name' });
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
      await page
        .locator('[data-testid="spacePlugin.createObject"]')
        .first()
        .waitFor({ state: 'visible', timeout: 60_000 });
      await closeCompanion(page);
    },
  },
  {
    name: 'Create a project from the Community Findings template',
    narration: 'The template brings the project, its instructions and the tasks; the memory comes next.',
    done: async ({ page }) => (await page.locator(PROJECT_NODE).count()) > 0,
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Start a project from the Community Findings template' });
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({ selector: '[data-testid="create-object-form.type.org.dxos.type.project"]', label: 'Project' });
      await demo.type({ selector: '[data-testid="create-project-panel.name-input"]', value: PROJECT, label: 'Name' });
      await demo.click({ selector: `[role="option"][data-value="${TEMPLATE}"]`, label: 'Community Findings' });
      await demo.click({ selector: '[role="dialog"] [data-testid="save-button"]', label: 'Save' });
      await page.getByTestId('org.dxos.type.project.section').first().waitFor({ state: 'visible', timeout: 60_000 });
      await closeCompanion(page);
      await showProject(page);
    },
  },
  {
    name: 'Read the tasks',
    narration: 'Five questions, each naming the artifact its answer goes in, and a deck that presents them.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Each task names the artifact its answer goes in' });
      await openTasks(demo, page);
      await page.waitForTimeout(BEAT * 3);
    },
  },
  {
    name: "Import the community's memory",
    narration: "Sixty days of the Cloudflare Developers Discord, as facts, go into the space's memory as TriG.",
    done: async ({ page }) =>
      page.evaluate(async (key) => {
        const space = dxos.spaces().find((candidate) => candidate.id === globalThis[key]);
        return !!space && globalThis.__communityImported === space.id;
      }, TAKE_SPACE),
    run: async ({ demo, page }) => {
      await demo.caption({ value: "Import the community's memory", subtitle: 'TriG: a named graph per fact' });
      await demo.click({ selector: 'button[aria-label="Memory"] >> nth=0', label: 'Memory' });
      await page.locator(MEMORY('import')).waitFor({ state: 'visible', timeout: 20_000 });
      // The sidebar slides in; a click before it settles lands beside the button and opens no chooser.
      await page.waitForTimeout(BEAT);
      await page.locator(MEMORY('import')).scrollIntoViewIfNeeded();
      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 30_000 }),
        demo.click({ selector: MEMORY('import'), label: 'Import TriG' }),
      ]);
      await chooser.setFiles(TRIG);
      await page.getByText(/Imported .* quads/).waitFor({ timeout: 180_000 });
      await page.evaluate((key) => {
        globalThis.__communityImported = globalThis[key];
      }, TAKE_SPACE);
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Hand every task to the agent',
    narration: 'All six tasks go to one agent session, which works them in order.',
    done: async ({ page }) => {
      const state = await taskState(page);
      return TASKS.every(({ title }) => state[title]?.status && state[title].status !== 'todo');
    },
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Hand every task to the agent' });
      await openTasks(demo, page);
      // A task already handed over is skipped: one named again is delegated to a second chat.
      const state = await taskState(page);
      for (const { title } of TASKS.filter(({ title }) => state[title]?.status === 'todo')) {
        await demo.click({ selector: `${taskRow(title)} >> [data-testid="taskList.item.checkbox"]`, label: title });
      }
      await page.waitForTimeout(BEAT);
      await demo.click({ selector: '[data-testid="projectsPlugin.delegateTasks"]', label: 'Delegate to agent' });
      await page.getByTestId('projectsPlugin.pipeline.chart').first().waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Wait while the agent queries the memory and files each artifact',
    narration: 'The agent queries the memory with SPARQL, makes each artifact and files it on its task.',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'The agent queries the memory, task by task',
        subtitle: 'Each artifact is filed on the task it answers',
      });
      await demo.speed({ factor: FAST });
      const deadline = Date.now() + 45 * 60_000;
      let state = await taskState(page);
      while (!TASKS.every((task) => finished(state, task))) {
        if (Date.now() > deadline) {
          throw new Error(`tasks unfinished after 45 minutes: ${JSON.stringify(state)}`);
        }
        await page.waitForTimeout(5_000);
        state = await taskState(page);
      }
      await demo.speed({ factor: 1 });
      await demo.clearCaption();
    },
  },
  {
    name: 'Open the questions by product',
    narration: 'The task now carries its artifact: a sheet of the counts, and the chart the agent drew from it.',
    run: async ({ demo, page }) => {
      await openTasks(demo, page);
      await openTask(demo, page, TASKS[0].title);
      await openArtifact(demo, page, TASKS[0]);
    },
  },
  {
    name: 'Open the question volume by week',
    run: async ({ demo, page }) => {
      await openTasks(demo, page);
      await openTask(demo, page, TASKS[1].title);
      await openArtifact(demo, page, TASKS[1]);
    },
  },
  {
    name: 'Open what members build with',
    run: async ({ demo, page }) => {
      await openTasks(demo, page);
      await openTask(demo, page, TASKS[2].title);
      await openArtifact(demo, page, TASKS[2]);
    },
  },
  {
    name: 'Open the recurring problems',
    run: async ({ demo, page }) => {
      await openTasks(demo, page);
      await openTask(demo, page, TASKS[3].title);
      await openArtifact(demo, page, TASKS[3]);
    },
  },
  {
    name: 'Read the docs-gap brief',
    run: async ({ demo, page }) => {
      await closeCompanion(page);
      await openTasks(demo, page);
      await openTask(demo, page, TASKS[4].title);
      await openArtifact(demo, page, TASKS[4]);
    },
  },
  {
    name: 'Open the deck',
    narration: 'The last task presents the rest: a deck of the four charts and the largest docs gaps.',
    run: async ({ demo, page }) => {
      await openTasks(demo, page);
      await openTask(demo, page, TASKS[5].title);
      await openArtifact(demo, page, TASKS[5]);
      await demo.clearCaption();
    },
  },
];
