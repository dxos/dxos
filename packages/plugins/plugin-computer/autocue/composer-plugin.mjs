//
// Copyright 2026 DXOS.org
//

import { existsSync, readFileSync } from 'node:fs';
import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * An agent works the Composer Plugin project template's parent task and four subtasks to build the World
 * Clock plugin, then the reader loads it, finds it in the registry, opens its Clocks page from the navtree
 * group it adds, and adds two timezones. Everything happens in the first space in the rail (My Space on a fresh profile).
 *
 * @mdl packages/plugins/plugin-computer/PLUGIN.mdl test QA-2
 * @app composer-app bundled dev build, served by `vite preview` on :4173, talking to EDGE preview
 *
 * Built and served from `packages/apps/composer-app`. Loading a plugin by URL needs the bundle's import
 * map, and the Computer shell only mounts in a vite server; EDGE production rejects the AI requests:
 *
 *   export DX_EDGE_BASE_URL=https://preview.dxos.network/ DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   moon run composer-app:bundle
 *   pnpm exec vite preview --configLoader native --port 4173 --strictPort
 *
 * Steps 1 and 2 are off-camera prep and persist in the profile. They also clear the last take: the World Clock
 * plugin is uninstalled and its source and build folders are deleted, so the agent starts from nothing.
 */

const TWENTY_MIN = 20 * 60_000;

/** The Assistant's remote model; Composer's default (Claude Sonnet 5) left the delegated chat silent. */
const MODEL = 'DeepSeek V4 Pro';

/** The plugin the agent builds, as the template's tasks name it. */
const PLUGIN_NAME = 'World Clock';

/** A beat for the viewer to read the registry card, which is the one shot that proves the load. */
const LINGER = 2_500;

/** The last take's source and build, relative to this file (`plugin-computer/autocue/`). */
const LEFTOVERS = [
  '../../../apps/composer-app/temp/plugins/world-clock/',
  '../../../../out/composer/plugins/world-clock/',
];

/**
 * The id of the project this take created, so a replay can tell it from a project an earlier take left
 * open in the deck. Outside the repo, and cleared when a take starts.
 */
const TAKE_PROJECT = join(tmpdir(), 'autocue-composer-plugin.project');

/** A plugin card in the registry list, by its display name. */
const card = (name) => `li[data-testid^="pluginList."]:has(span:text-is("${name}"))`;

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

/** A narrow window collapses the navtree into an overlay; open it before clicking an item in it. */
const showSidebar = async ({ demo, page }, testId, label) => {
  // A beat for the tree to render first: the button toggles, so pressing it over an open sidebar closes it.
  // Checked by position, not `isVisible`: the collapsed overlay keeps its items laid out, just off screen.
  const item = page.getByTestId(testId).first();
  await item.waitFor({ state: 'visible', timeout: 2_000 }).catch(() => {});
  const box = await item.boundingBox().catch(() => null);
  if (!box || box.x < 0) {
    await demo.click({
      selector: 'button:visible:has-text("Open sidebar")',
      label: 'Open sidebar',
      hud: label !== undefined,
    });
  }
  await demo.click({ selector: `[data-testid="${testId}"]`, ...(label ? { label } : { hud: false }) });
};

/** The type the plugin stores its timezones in, as the guide defines it. */
const CLOCK_TYPE = 'org.example.type.worldClock';

/** Timezones added on camera, beside the local one the page starts with. */
const TIMEZONES = ['Asia/Tokyo', 'Europe/London'];

/** Contributed by plugin-computer's `src/templates/composer-plugin.ts`. */
const TEMPLATE_ID = 'org.dxos.project.composerPlugin';

export const steps = [
  {
    // Destructive, so replay-guarded. The driver consults `done` only when replaying the steps before a
    // `from`; a take started from step 1 always runs this, so it always starts from empty folders. Once the
    // agent has written its source the take is under way, and a replay must not delete that work.
    name: 'Prep (off camera): clear the last take',
    setup: true,
    done: () => existsSync(new URL(LEFTOVERS[0], import.meta.url)),
    run: async ({ page }) => {
      for (const folder of LEFTOVERS) {
        await rm(new URL(folder, import.meta.url), { recursive: true, force: true });
      }
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
    // No `done`: every action here is idempotent, so a replay simply re-applies it.
    name: 'Prep (off camera): enable Coding (Dev), pick the model, dismiss notices',
    setup: true,
    run: async ({ demo, page }) => {
      // The toast mounts a few seconds after boot, so wait briefly for it rather than checking once.
      const notice = page.locator(
        '[data-testid="org.dxos.plugin.observability.notice"] button:not(:has-text("Settings"))',
      );
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
      // On a fresh profile the first click can land while the navtree is still settling; retry it.
      const filter = page.locator('input[placeholder="Filter…"]').first();
      for (let attempt = 0; attempt < 3; attempt++) {
        await demo.click({ selector: '[data-testid="treeView.pluginRegistry"]', hud: false });
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

      // A plugin loaded in an earlier take persists in the profile, enabled (Enabled) or not (Labs, by
      // its tag); uninstall it from its detail page. Only before the agent has started: a replay after
      // it has built must keep the plugin it offered.
      // Skipped when nothing is loaded under that name, which also keeps a clean take off the sidebar.
      const underway = existsSync(new URL(LEFTOVERS[0], import.meta.url));
      const loaded = await page.evaluate(
        (name) => composer.plugins().some((plugin) => plugin.name === name),
        PLUGIN_NAME,
      );
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
        await demo.click({ selector: '[data-testid="treeView.appSettings"]', hud: false });
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
      await page
        .locator('[data-testid="deck.plank"][data-attendable-id$="/home"]')
        .first()
        .waitFor({ timeout: 15_000 });
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
    name: 'Wait for the agent to offer the plugin',
    run: async ({ page }) => {
      await page.getByTestId('assistant.pluginUrlPrompt').waitFor({ state: 'visible', timeout: TWENTY_MIN });
    },
  },
  {
    // The prompt loads without enabling, so the plugin is turned on in the registry, on camera.
    name: 'Load the plugin',
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="assistant.pluginUrlPrompt.load"]', label: 'Load' });
      await page.waitForFunction((name) => composer.plugins().some((plugin) => plugin.name === name), PLUGIN_NAME, {
        timeout: 30_000,
      });
      await page.waitForTimeout(LINGER);
    },
  },
  {
    // The registry shot is the one that proves the load, so the side panels close first and the take
    // slows down: Labs after a beat, then the card, then the toggle.
    name: 'Enable the plugin in the registry',
    done: async ({ page }) =>
      page.evaluate((name) => composer.plugins().some((plugin) => plugin.name === name && plugin.enabled), PLUGIN_NAME),
    run: async ({ demo, page }) => {
      for (const label of ['Close companion', 'Close context sidebar']) {
        const button = page.locator(`button:has-text("${label}")`).first();
        if (await button.isVisible().catch(() => false)) {
          await demo.click({ selector: `button:has-text("${label}") >> nth=0`, label });
          await page.waitForTimeout(LINGER / 5);
        }
      }
      await demo.click({ selector: '[data-testid="treeView.pluginRegistry"]', label: 'Plugins' });
      await page.waitForTimeout(1_000);
      await showSidebar({ demo, page }, 'pluginRegistry.labs', 'Labs');
      const plugin = page.locator(card(PLUGIN_NAME));
      await plugin.waitFor({ state: 'visible', timeout: 10_000 });
      await plugin.scrollIntoViewIfNeeded();
      await demo.hover({ selector: card(PLUGIN_NAME), label: PLUGIN_NAME });
      await page.waitForTimeout(LINGER);
      const toggle = `${card(PLUGIN_NAME)} input[type="checkbox"]`;
      if (!(await page.locator(toggle).isChecked())) {
        await demo.click({ selector: toggle, label: 'Enable' });
      }
      await page.waitForFunction(
        (name) => composer.plugins().some((plugin) => plugin.name === name && plugin.active),
        PLUGIN_NAME,
        { timeout: 15_000 },
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
