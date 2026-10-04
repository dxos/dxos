//
// Copyright 2026 DXOS.org
//

import { spawn } from 'node:child_process';
import { existsSync, openSync, readFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * An agent works the Composer Plugin project template's parent task and four subtasks to write the World
 * Clock plugin, then the reader loads it from the plugin's dev server through Plugins → Dev Server, opens its
 * Clocks page from the navtree group it adds, and adds two timezones. Everything happens in the first space
 * in the rail (My Space on a fresh profile).
 *
 * @mdl packages/plugins/plugin-computer/PLUGIN.mdl test QA-2
 * @app composer-app bundled dev build, served by `vite preview` on :4173, talking to EDGE preview; the plugin's
 *   own Vite dev server on :3967, which step 3 starts
 *
 * Built and served from `packages/apps/composer-app`. The plugin's bare imports need the bundle's import
 * map, and the Computer shell only mounts in a vite server; EDGE production rejects the AI requests:
 *
 *   export DX_EDGE_BASE_URL=https://preview.dxos.network/ DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   moon run composer-app:bundle
 *   pnpm exec vite preview --configLoader native --port 4173 --strictPort
 *
 * Steps 1 to 3 are off-camera prep. They clear the last take (its dev server, plugin folder, project and
 * Dev Server setting), then seed the plugin's three config files and start its dev server, which the Computer
 * shell cannot host. The agent writes the plugin's source from nothing.
 */

export const TWENTY_MIN = 20 * 60_000;

/** The Assistant's remote model; Composer's default (Claude Sonnet 5) left the delegated chat silent. */
const MODEL = 'DeepSeek V4 Pro';

/** The plugin the agent builds, as the template's tasks name it. */
export const PLUGIN_NAME = 'World Clock';

/** The template's last subtask; the agent finishes it once it has told the reader the plugin is ready. */
const OFFER_TASK = 'Offer the plugin to load';

/** Statuses that mean a task is finished: an agent may leave it for the reader to review rather than done. */
const FINISHED = ['done', 'review'];

/** A beat for the viewer to take in the result of a step. */
export const LINGER = 2_500;

/** The Composer app directory, where the dev server runs as the template's command does. */
const COMPOSER_APP = fileURLToPath(new URL('../../../apps/composer-app/', import.meta.url));

/** The plugin's folder under the app's gitignored `temp/`, as the template names it. */
const PLUGIN_DIR = join(COMPOSER_APP, 'temp/plugins/world-clock');

/** Written by the agent, so its presence means the take is under way and a replay must keep it. */
const SOURCE = join(PLUGIN_DIR, 'src');

/** `composerPlugin`'s default dev port, which Plugins → Dev Server loads from by default. */
const DEV_MANIFEST = 'http://localhost:3967/manifest.json';

/** The plugin's entry, which the dev server compiles on request: 404 until written, 500 while it does not parse. */
const DEV_ENTRY = 'http://localhost:3967/src/plugin.tsx';

/** The dev server outlives the driver, so the next take finds it by pid. Outside the repo. */
const DEV_SERVER_PID = join(tmpdir(), 'autocue-composer-plugin.vite.pid');
const DEV_SERVER_LOG = join(tmpdir(), 'autocue-composer-plugin.vite.log');

/**
 * The plugin's config as the guide gives it, so the dev server can start before the agent writes any source.
 * The agent writes these files again; Vite restarts on a changed `vite.config.ts`.
 */
const SEED = {
  'dx.config.ts': `import { Config2 } from '@dxos/app-framework/config';

export default Config2.make({
  plugin: {
    key: 'org.example.plugin.worldClock',
    name: 'World Clock',
    icon: { key: 'ph--globe-hemisphere-west--regular', hue: 'sky' },
    tags: ['labs'],
    dependsOn: ['org.dxos.plugin.map'],
  },
});
`,
  'vite.config.ts': `import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { composerPlugin } from '@dxos/app-framework/vite-plugin';

export default defineConfig({
  plugins: [...composerPlugin({ entry: 'src/plugin.tsx' }), react()],
});
`,
  'tsconfig.json': `{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "types": []
  },
  "include": ["src", "dx.config.ts"]
}
`,
};

const answers = (url) =>
  fetch(url, { signal: AbortSignal.timeout(2_000) }).then(
    (response) => response.ok,
    () => false,
  );

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Stops the dev server an earlier take started, by its process group, and waits for the port to free. */
const stopDevServer = async () => {
  if (existsSync(DEV_SERVER_PID)) {
    try {
      process.kill(-Number(readFileSync(DEV_SERVER_PID, 'utf8')), 'SIGTERM');
    } catch (error) {
      // Already gone, e.g. after a reboot.
      if (error.code !== 'ESRCH') {
        throw error;
      }
    }
    await rm(DEV_SERVER_PID, { force: true });
  }
  for (let attempt = 0; attempt < 20 && (await answers(DEV_MANIFEST)); attempt++) {
    await sleep(500);
  }
  if (await answers(DEV_MANIFEST)) {
    throw new Error(`${DEV_MANIFEST} is served by a process this flow did not start; stop it first`);
  }
};

/**
 * Starts the template's dev server command, detached so it survives the driver, and waits for its manifest.
 * Under the driver's own Node rather than the first one on PATH, which can be too old for Vite.
 */
const startDevServer = async () => {
  const log = openSync(DEV_SERVER_LOG, 'w');
  const vite = join(COMPOSER_APP, 'node_modules/vite/bin/vite.js');
  const child = spawn(process.execPath, [vite, 'temp/plugins/world-clock'], {
    cwd: COMPOSER_APP,
    detached: true,
    stdio: ['ignore', log, log],
  });
  child.unref();
  await writeFile(DEV_SERVER_PID, String(child.pid));
  for (let attempt = 0; attempt < 60; attempt++) {
    if (child.exitCode !== null) {
      break;
    }
    if (await answers(DEV_MANIFEST)) {
      return;
    }
    await sleep(1_000);
  }
  // Stopped here rather than left for the next take, so a failed start leaves nothing holding the port.
  await stopDevServer().catch(() => {});
  throw new Error(`the plugin's dev server did not serve ${DEV_MANIFEST}; see ${DEV_SERVER_LOG}`);
};

/**
 * The id of the project this take created, so a replay can tell it from a project an earlier take left
 * open in the deck. Outside the repo, and cleared when a take starts.
 */
const TAKE_PROJECT = join(tmpdir(), 'autocue-composer-plugin.project');

/** A plugin card in the registry list, by its display name. */
export const card = (name) => `li[data-testid^="pluginList."]:has(span:text-is("${name}"))`;

/** The first space in the rail, where the take runs. */
const SPACE = '[data-testid="spacePlugin.space"] >> nth=0';

/** The same tab as a CSS selector, for code that runs in the page. */
const SPACE_TAB = '[data-testid="spacePlugin.space"]';

/** The project's title, typed on camera. */
const PROJECT_TITLE = 'World Clock';

/** Projects an earlier take may have left: this title, an earlier one, and the template's default name. */
const LEFTOVER_PROJECTS = [PROJECT_TITLE, 'Clock Plugin', 'Composer Plugin'];

/** The project plank's rows, and the companion beside it. */
const TASK_ROW = '[data-testid="deck.plank"] [data-testid="taskList.item"]';
const COMPANION_TAB = (name) => `[data-testid="deck.companion"] >> role=tab[name="${name}"]`;

/**
 * A narrow window collapses the navtree into an overlay; open it before clicking an item in it. A workspace
 * that has just opened can collapse it a beat later, after the check, so a click that misses checks again.
 */
export const showSidebar = async ({ demo, page }, testId, label) => {
  // A beat for the tree to render first: the button toggles, so pressing it over an open sidebar closes it.
  // Checked by position, not `isVisible`: the collapsed overlay keeps its items laid out, just off screen.
  const item = page.getByTestId(testId).first();
  await item.waitFor({ state: 'visible', timeout: 2_000 }).catch(() => {});
  for (let attempt = 0; ; attempt++) {
    const box = await item.boundingBox().catch(() => null);
    if (!box || box.x < 0) {
      await demo.click({
        selector: 'button:visible:has-text("Open sidebar")',
        label: 'Open sidebar',
        hud: label !== undefined,
      });
    }
    try {
      await demo.click({
        selector: `[data-testid="${testId}"]`,
        ...(label ? { label } : { hud: false }),
        ...(attempt < 2 ? { timeout: 2_000 } : {}),
      });
      return;
    } catch (error) {
      if (attempt >= 2) {
        throw error;
      }
    }
  }
};

/** Opens a plugin's page in Plugin Settings. With a `label` the clicks show on camera. */
const openPluginSettings = async ({ demo, page }, plugin, { label } = {}) => {
  await demo.click({
    selector: '[data-testid="treeView.appSettings"]',
    ...(label ? { label: 'Plugin Settings' } : { hud: false }),
  });
  await page.waitForURL(/dxos:settings/, { timeout: 10_000 });
  await showSidebar({ demo, page }, `settings.${plugin}`, label);
};

/** Plugins → Dev Server's one button, which reads Enable or Disable. */
const DEV_TOGGLE = '[data-testid="registrySettings.devPluginToggle"]';

/** Plugins → Dev Server's Manifest URL field. */
const DEV_URL = '[data-testid="registrySettings.devPluginUrl"]';

/** The type the plugin stores its timezones in, as the guide defines it. */
const CLOCK_TYPE = 'org.example.type.worldClock';

/** Timezones added on camera, beside the local one the page starts with. */
const TIMEZONES = ['Asia/Tokyo', 'Europe/London'];

/** Contributed by plugin-computer's `src/templates/composer-plugin.ts`. */
const TEMPLATE_ID = 'org.dxos.project.composerPlugin';

/**
 * Off-camera prep shared with plugin-projects' desktop and registry flows: dismiss the notice, enable Coding (Dev)
 * and turn off Dev Server when the take needs the browser template, uninstall an earlier take's plugin, pick the
 * model, and open the space's Home. Every action is idempotent, so a replay simply re-applies it.
 */
export const prepare = async ({ demo, page }, { codingDev }) => {
  // The toast mounts a few seconds after boot, so wait briefly for it rather than checking once.
  const notice = page.locator('[data-testid="org.dxos.plugin.observability.notice"] button:not(:has-text("Settings"))');
  if (
    await notice
      .first()
      .waitFor({ state: 'visible', timeout: 8_000 })
      .then(
        () => true,
        () => false,
      )
  ) {
    await notice.first().click();
  }
  // An earlier take leaves Dev Server on, loading its plugin at boot; turning it off removes that plugin.
  // Only before the agent has started: a replay after it has written the plugin must keep it loaded.
  const underway = existsSync(SOURCE);
  if (codingDev && !underway) {
    await openPluginSettings({ demo, page }, 'org.dxos.plugin.registry');
    await page.locator(DEV_TOGGLE).waitFor({ state: 'visible', timeout: 10_000 });
    if ((await page.locator(DEV_TOGGLE).textContent())?.trim() === 'Disable') {
      await demo.click({ selector: DEV_TOGGLE, hud: false });
      await page.locator(`${DEV_TOGGLE}:text-is("Enable")`).waitFor();
    }
    // The URL persists in the profile, so a take must not inherit one an earlier session changed.
    if ((await page.locator(DEV_URL).inputValue()) !== DEV_MANIFEST) {
      await demo.fill({ selector: DEV_URL, value: DEV_MANIFEST, hud: false });
    }
  }

  if (codingDev) {
    // Coding (Dev) contributes the template in a browser.
    // On a fresh profile the first click can land while the navtree is still settling; retry it.
    const filter = page.locator('input[placeholder="Filter…"]').first();
    // The registry reopens on whatever it last showed, which can be a plugin's page with no filter; Bundled
    // lists every bundled plugin, Coding (Dev) among them.
    for (let attempt = 0; attempt < 3; attempt++) {
      await demo.click({ selector: '[data-testid="treeView.pluginRegistry"]', hud: false });
      if (attempt > 0) {
        await showSidebar({ demo, page }, 'pluginRegistry.bundled');
      }
      if (
        await filter.waitFor({ state: 'visible', timeout: 5_000 }).then(
          () => true,
          () => false,
        )
      ) {
        break;
      }
    }
    await demo.fill({ selector: 'input[placeholder="Filter…"]', value: 'Coding (Dev)', hud: false });
    const toggle = page.locator('input[id="org.dxos.plugin.computer-input"]');
    await toggle.waitFor({ state: 'visible', timeout: 10_000 });
    if (!(await toggle.isChecked())) {
      await toggle.click();
    }
    await demo.fill({ selector: 'input[placeholder="Filter…"]', value: '', hud: false });
  }

  // A take from before Dev Server loaded the plugin by URL, which persists in the profile, enabled
  // (Enabled) or not (Labs, by its tag); uninstall it from its detail page, under the same guard.
  // Skipped when nothing is loaded under that name, which also keeps a clean take off the sidebar.
  const loaded = await page.evaluate((name) => composer.plugins().some((plugin) => plugin.name === name), PLUGIN_NAME);
  for (const category of underway || !loaded ? [] : ['installed', 'labs']) {
    const tab = page.getByTestId(`pluginRegistry.${category}`);
    if ((await tab.count()) === 0) {
      continue;
    }
    await showSidebar({ demo, page }, `pluginRegistry.${category}`);
    await page.waitForTimeout(500);
    if ((await page.locator(card(PLUGIN_NAME)).count()) > 0) {
      await demo.click({ selector: `${card(PLUGIN_NAME)} >> text=${PLUGIN_NAME}`, hud: false });
      await demo.click({ selector: 'button:has-text("Uninstall")', hud: false });
      await page.locator(card(PLUGIN_NAME)).waitFor({ state: 'detached', timeout: 10_000 });
    }
  }

  // A delegated chat runs on the settings' default model, not the chat picker's, so set it here.
  // The rail's settings button rather than ⌘, which the filter input swallows while it has focus.
  const model = page.locator('role=combobox[name="Remote language model"]').first();
  for (let attempt = 0; attempt < 3; attempt++) {
    await openPluginSettings({ demo, page }, 'org.dxos.plugin.assistant');
    if (
      await model.waitFor({ state: 'visible', timeout: 5_000 }).then(
        () => true,
        () => false,
      )
    ) {
      break;
    }
  }
  await demo.click({ selector: 'role=combobox[name="Remote language model"]', hud: false });
  await demo.click({ selector: `role=option[name="${MODEL}"]`, hud: false });
  await page.locator('role=combobox[name="Remote language model"]', { hasText: MODEL }).waitFor();

  // The take opens on the space's Home screen.
  await demo.click({ selector: SPACE, hud: false });
  await showSidebar({ demo, page }, 'spacePlugin.spaceHome');
  await page.locator('[data-testid="deck.plank"][data-attendable-id$="/home"]').first().waitFor({ timeout: 15_000 });
};

export const steps = [
  {
    // Destructive, so replay-guarded. The driver consults `done` only when replaying the steps before a
    // `from`; a take started from step 1 always runs this, so it always starts from empty folders. Once the
    // agent has written its source the take is under way, and a replay must not delete that work.
    name: 'Prep (off camera): clear the last take',
    setup: true,
    done: () => existsSync(SOURCE),
    run: async ({ page }) => {
      await stopDevServer();
      await rm(PLUGIN_DIR, { recursive: true, force: true });
      await rm(TAKE_PROJECT, { force: true });

      // Earlier takes' projects (and the chats filed under them) go too, so the navtree shows only this
      // take's. Through the space's own remove operation, so it cascades as a delete from the UI does.
      await page.waitForFunction(
        (tab) => globalThis.composer?.invoke && globalThis.dxos?.spaces && document.querySelector(tab),
        SPACE_TAB,
        { timeout: 60_000 },
      );
      await page.evaluate(
        async ({ tab, names, CLOCK_TYPE }) => {
          const spaceId = document.querySelector(tab).dataset.value.split('/').pop();
          const projects = await dxos
            .spaces(spaceId)
            .db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.project')))
            .run();
          // The last take's clocks go too, so this one starts from the local timezone alone.
          const clocks = await dxos
            .spaces(spaceId)
            .db.query(dxos.Filter.type(dxos.DXN.make(CLOCK_TYPE)))
            .run();
          const objects = [...projects.filter((project) => names.includes(project.name)), ...clocks];
          if (objects.length > 0) {
            await composer.invoke('org.dxos.operation.space.removeObjects', { objects }, { spaceId });
          }
        },
        { tab: SPACE_TAB, names: LEFTOVER_PROJECTS, CLOCK_TYPE },
      );
    },
  },
  {
    name: 'Prep (off camera): enable Coding (Dev), turn off Dev Server, pick the model, dismiss notices',
    setup: true,
    run: (context) => prepare(context, { codingDev: true }),
  },
  {
    // Before the take, so the agent's check of the dev server finds it running. A replay keeps a running
    // server and the agent's files; Vite restarts itself when the agent rewrites `vite.config.ts`.
    name: "Prep (off camera): seed the plugin's config and start its dev server",
    setup: true,
    done: () => answers(DEV_MANIFEST),
    run: async () => {
      await mkdir(PLUGIN_DIR, { recursive: true });
      for (const [file, content] of Object.entries(SEED)) {
        if (!existsSync(join(PLUGIN_DIR, file))) {
          await writeFile(join(PLUGIN_DIR, file), content);
        }
      }
      await stopDevServer();
      await startDevServer();
    },
  },
  {
    name: 'Create a project from the Composer Plugin template',
    // Replay only (see step 1): skipped when the project this take created is open in the deck again, not
    // merely any project plank an earlier take left behind.
    done: async ({ page }) => {
      const id = existsSync(TAKE_PROJECT) ? readFileSync(TAKE_PROJECT, 'utf8').trim() : undefined;
      return (
        id !== undefined && (await page.locator(`[data-testid="deck.plank"][data-attendable-id$="/${id}"]`).count()) > 0
      );
    },
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({ selector: '[data-testid="create-object-form.type.org.dxos.type.project"]', label: 'Project' });
      // Picked from the list, not filtered for: the reader sees the templates on offer.
      await demo.click({ selector: `[role="option"][data-value="${TEMPLATE_ID}"]`, label: 'Composer Plugin' });
      await demo.type({
        selector: '[data-testid="create-project-panel.name-input"]',
        value: PROJECT_TITLE,
        label: 'Title',
      });
      await demo.click({ selector: '[role="dialog"] [data-testid="save-button"]', label: 'Create' });
      await page.getByTestId('projectsPlugin.tab.tasks').first().waitFor({ state: 'visible', timeout: 30_000 });
      const plank = await page
        .locator('[data-testid="deck.plank"][data-attendable-id*="/org.dxos.type.project/"]')
        .first()
        .getAttribute('data-attendable-id');
      if (plank) {
        await writeFile(TAKE_PROJECT, plank.split('/').at(-1) ?? '');
      }

      // The project opens as a folder in the navtree, so the viewer sees what it holds as the run fills it.
      // Matched on the row's own heading: a parent item's text includes its children's.
      const row = `[data-testid="deck.sidebar"] [data-part="branch-control"]:has(> * > [data-testid="treeItem.heading"] span:text-is("${PROJECT_TITLE}"))`;
      await page.locator(row).first().waitFor({ state: 'attached', timeout: 10_000 });
      if ((await page.locator(row).first().getAttribute('data-state')) !== 'open') {
        if (!(await page.locator(row).first().isVisible())) {
          await demo.click({ selector: 'button:visible:has-text("Open sidebar")', label: 'Open sidebar' });
        }
        // The toggle stays disabled until the project's children have loaded.
        const toggle = `${row} >> [data-testid="treeItem.toggle"] >> nth=0`;
        await page
          .locator(`${row} >> [data-testid="treeItem.toggle"]:not([disabled])`)
          .first()
          .waitFor({ timeout: 15_000 });
        await demo.click({ selector: toggle, label: 'Open project' });
        await page.locator(`${row}[data-state="open"]`).first().waitFor({ timeout: 5_000 });
      }
    },
  },
  {
    name: "Open the project's tasks",
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="projectsPlugin.tab.tasks"] >> nth=0', label: 'Tasks' });
      await page.getByTestId('taskList.item').nth(4).waitFor({ state: 'visible', timeout: 15_000 });
    },
  },
  {
    // Delegating a parent hands the agent its whole subtree, so the one tick is enough.
    name: 'Select the parent task and assign it to the agent',
    run: async ({ demo }) => {
      await demo.click({
        selector: '[data-testid="taskList.item"] >> nth=0 >> [data-testid="taskList.item.checkbox"]',
        label: 'Select task',
      });
      await demo.click({
        selector: '[data-testid="projectsPlugin.delegateTasks"]',
        label: 'Assign selected tasks to agent',
      });
    },
  },
  {
    name: 'Open the agent session',
    run: async ({ demo, page }) => {
      // Assigning does not reliably bring the Assistant companion forward: the pane can be closed, or its
      // tab still mounting, so open the pane if needed and confirm the tab took rather than clicking once.
      await page.getByTestId('projectsPlugin.pipeline.chart').waitFor({ state: 'visible', timeout: 30_000 });
      const TAB = COMPANION_TAB('Assistant');
      const tab = page.locator(TAB).first();
      const status = page.getByTestId('assistant.chat-status');
      const visible = (locator, timeout) =>
        locator.waitFor({ state: 'visible', timeout }).then(
          () => true,
          () => false,
        );
      for (let attempt = 0; attempt < 3; attempt++) {
        if (!(await visible(tab, 10_000))) {
          await demo.click({
            selector:
              '[data-testid="deck.plank"]:has([data-testid="projectsPlugin.pipeline.chart"]) [data-testid="plankHeading.companion"]',
            label: 'Open companion',
          });
          if (!(await visible(tab, 10_000))) {
            continue;
          }
        }
        if ((await tab.getAttribute('aria-selected')) !== 'true') {
          await demo.click({ selector: TAB, label: 'Assistant' });
        }
        if ((await tab.getAttribute('aria-selected')) === 'true' && (await visible(status, 15_000))) {
          return;
        }
      }
      throw new Error('the Assistant companion did not open after assigning the tasks');
    },
  },
  {
    // The checklist starts collapsed; opened for a moment so the viewer sees the tasks the agent holds.
    name: "Show the chat's tasks, then hide them",
    run: async ({ demo, page }) => {
      const toggle = '[data-testid="deck.companion"] [data-testid="assistant.toggle-tasks"]';
      const checklist = page.locator('[data-testid="deck.companion"] [data-testid="taskList.item"]').first();
      await demo.click({ selector: toggle, label: 'Show tasks' });
      await checklist.waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(3_000);
      await demo.click({ selector: toggle, label: 'Hide tasks' });
      await checklist.waitFor({ state: 'hidden', timeout: 10_000 });
    },
  },
  {
    name: 'Open the Trace panel',
    run: async ({ demo, page }) => {
      await demo.click({ selector: 'role=tab[name="Trace"] >> nth=0', label: 'Trace' });
      await page.getByTestId('tracePanel.filter').waitFor({ state: 'visible', timeout: 10_000 });
    },
  },
  {
    // Selecting a task brings its detail into the companion, so walking the rows shows each one's.
    name: 'Select each task in turn',
    run: async ({ demo, page }) => {
      for (let index = 0; index < 4; index++) {
        await demo.click({
          selector: `${TASK_ROW} >> nth=${index} >> [data-testid="taskList.item.title"]`,
          label: 'Task',
        });
        await page.waitForTimeout(1_000);
      }
    },
  },
  {
    name: 'Return to the chat',
    run: async ({ demo, page }) => {
      await demo.click({ selector: COMPANION_TAB('Assistant'), label: 'Assistant' });
      await page.getByTestId('assistant.chat-status').waitFor({ state: 'visible', timeout: 15_000 });
    },
  },
  {
    // The last subtask is the agent telling the reader the plugin is ready; its status is the signal.
    name: 'Wait for the agent to offer the plugin',
    run: async ({ page }) => {
      const project = readFileSync(TAKE_PROJECT, 'utf8').trim();
      // Polled from here rather than with `waitForFunction`, which takes a returned promise as truthy; a failed
      // read (the page reloading, say) counts as not yet.
      const offered = () =>
        page
          .evaluate(
            async ({ tab, project, title, finished }) => {
              const spaceId = document.querySelector(tab).dataset.value.split('/').pop();
              const projects = await dxos
                .spaces(spaceId)
                .db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.project')))
                .run();
              const taskSet = await projects.find((candidate) => candidate.id === project)?.taskSet?.load();
              const [parent] = await Promise.all((taskSet?.tasks ?? []).map((ref) => ref.load()));
              const subtasks = await Promise.all((parent?.subtasks ?? []).map((ref) => ref.load()));
              return subtasks.some((task) => task.title === title && finished.includes(task.status));
            },
            { tab: SPACE_TAB, project, title: OFFER_TASK, finished: FINISHED },
          )
          .catch(() => false);
      const deadline = Date.now() + TWENTY_MIN;
      while (!(await offered())) {
        if (Date.now() > deadline) {
          throw new Error(`the agent did not finish "${OFFER_TASK}" within twenty minutes`);
        }
        await page.waitForTimeout(2_000);
      }
      await page.waitForTimeout(LINGER);
    },
  },
  {
    // A dev plugin is loaded and enabled in one click, and loads again on every reload while Dev Server is on.
    name: 'Load the plugin from the dev server',
    done: async ({ page }) =>
      page.evaluate((name) => composer.plugins().some((plugin) => plugin.name === name && plugin.active), PLUGIN_NAME),
    run: async ({ demo, page }) => {
      // A failed import makes Composer reload itself as if a deploy had moved its chunks, so check first.
      if (!(await answers(DEV_ENTRY))) {
        throw new Error(`the dev server does not compile ${DEV_ENTRY} yet; the agent has not written a working plugin`);
      }
      for (const label of ['Close companion', 'Close context sidebar']) {
        const button = page.locator(`button:has-text("${label}")`).first();
        if (await button.isVisible().catch(() => false)) {
          await demo.click({ selector: `button:has-text("${label}") >> nth=0`, label });
          await page.waitForTimeout(LINGER / 5);
        }
      }
      await openPluginSettings({ demo, page }, 'org.dxos.plugin.registry', { label: 'Plugins' });
      await page.locator(DEV_TOGGLE).waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(LINGER);
      await demo.click({ selector: DEV_TOGGLE, label: 'Enable' });
      await page.waitForFunction(
        (name) => composer.plugins().some((plugin) => plugin.name === name && plugin.active),
        PLUGIN_NAME,
        { timeout: 30_000 },
      );
      await page.waitForTimeout(LINGER);
    },
  },
  {
    name: 'Open the Clocks page',
    run: async ({ demo, page }) => {
      await demo.click({ selector: SPACE, label: 'Space' });
      // The plugin adds a group to the space's navtree; the built-in groups must still be there beside it.
      const sidebar = page.getByTestId('deck.sidebar');
      await sidebar.getByText(PLUGIN_NAME, { exact: true }).first().waitFor({ state: 'visible', timeout: 15_000 });
      await sidebar.getByTestId('spacePlugin.collectionsSection').waitFor({ state: 'visible', timeout: 5_000 });
      await page.waitForTimeout(LINGER / 2);
      await demo.click({ selector: '[data-testid="deck.sidebar"] >> text="Clocks"', label: 'Clocks' });
      await page.getByTestId('worldClock.clock').first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(3_000);
    },
  },
  {
    name: 'Add two timezones',
    run: async ({ demo, page }) => {
      const clocks = page.getByTestId('worldClock.clock');
      const start = await clocks.count();
      for (const [index, timezone] of TIMEZONES.entries()) {
        await demo.click({ selector: '[data-testid="worldClock.add"]', label: 'Add clock' });
        await demo.click({ selector: '[data-testid="worldClock.new"] >> role=combobox', label: 'Timezone' });
        await demo.click({ selector: `role=option[name="${timezone}"]`, label: timezone });
        await demo.click({ selector: '[data-testid="worldClock.new"] [data-testid="save-button"]', label: 'Save' });
        // Counted, not indexed: the row is sorted west to east, so a new clock can land anywhere in it.
        await page.waitForFunction(
          (count) => document.querySelectorAll('[data-testid="worldClock.clock"]').length === count,
          start + index + 1,
          { timeout: 10_000 },
        );
        await page.waitForTimeout(LINGER / 2);
      }
      await page.waitForTimeout(3_000);
    },
  },
  {
    // Selecting a clock highlights its pin; on the globe the earth turns to it about its axis.
    name: 'Select the clocks on the map, then on the globe',
    run: async ({ demo, page }) => {
      const selectEach = async (pause) => {
        const count = await page.getByTestId('worldClock.clock').count();
        for (let index = 0; index < count; index++) {
          await demo.click({ selector: `[data-testid="worldClock.clock"] >> nth=${index}`, label: 'Clock' });
          await page.waitForTimeout(pause);
        }
      };
      await selectEach(1_000);
      await demo.click({ selector: '[data-testid="worldMap.toggle"]', label: 'Globe' });
      await page.waitForTimeout(1_000);
      await selectEach(2_500);
    },
  },
];
