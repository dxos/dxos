//
// Copyright 2026 DXOS.org
//

import { readFile } from 'node:fs/promises';

// Re-imported with the driver's cache-busting query, which reaches only the file it loads, so an edit to the
// browser flow is picked up by the next `run` too.
const {
  prepare,
  steps: browserSteps,
  TAKE_PROJECT,
} = await import(`../../plugin-dev-shell/autocue/composer-plugin.mjs${new URL(import.meta.url).search}`);

/**
 * The Composer Plugin demo in a browser, ending in the private plugin registry: the assistant builds World Clock
 * from scratch in a Sandbox on EDGE, the sandbox it creates already holds an API token for the reader's account
 * (`DX_API_TOKEN`), and `dx registry publish --private` uploads the build. The plugin then appears in Plugins ->
 * Registry on its own, with nothing loaded by URL; the reader installs it there and opens its Clocks page. Last, the
 * registry opens the plugin's specification: the `PLUGIN.mdl` the template seeded, carried by the published bundle.
 *
 * @mdl packages/plugins/plugin-projects/PLUGIN.mdl test QA-2
 * @app composer-app production bundle served by `vite preview` on :4173, talking to EDGE dev
 *
 *   export DX_EDGE_BASE_URL=https://dev.dxos.network/ DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   export DX_PLUGIN_TOOLCHAIN_COMMIT=<a main commit pkg.pr.new has published>
 *   export DX_PLUGIN_TOOLCHAIN_CLI=<an npm tarball URL of a `dx` with `registry publish --private`>   # until one ships
 *   moon run composer-app:bundle
 *   pnpm exec vite preview --configLoader native --port 4173 --strictPort
 *
 * Remote plugins install only from a bundle (vite dev has no import map). EDGE must run registry-service with its
 * `PLUGIN_REGISTRY_DB`. The first setup step binds the app's identity to a `test+...@dxos.org` account, which EDGE dev
 * and preview admit with no invitation, so a fresh profile needs no sign-in.
 */

/** The hub the bundle talks to; `DX_EDGE_BASE_URL` at build time. */
const HUB_URL = `${process.env.DX_EDGE_BASE_URL ?? 'https://dev.dxos.network/'}hub/`;

/** Marks the identity this profile last bound, so a restarted take does not bind it again. */
const BOUND_KEY = 'autocue.composerPluginRegistry.boundIdentity';

/** EDGE takes a few minutes to serve a newly bound identity; the sandbox's token mint fails before then. */
const BIND_SETTLE = 3 * 60_000;

const TWENTY_FIVE_MIN = 25 * 60_000;

/** EDGE dev's ai-service serves Anthropic but not DeepSeek, the model the shared prep picks. */
const MODEL = 'Claude Sonnet 5';

/** Sets the Assistant's remote model in settings, which a delegated chat runs on, then returns to the space. */
const pickModel = async ({ demo, page }, model) => {
  const picker = page.locator('role=combobox[name="Remote language model"]').first();
  if (!(await picker.isVisible().catch(() => false))) {
    await demo.click({ selector: '[data-testid="treeView.appSettings"]', hud: false });
  }
  // Settings reopen on their last page, often already the Assistant's.
  if (
    !(await picker.waitFor({ state: 'visible', timeout: 3_000 }).then(
      () => true,
      () => false,
    ))
  ) {
    await demo.click({ selector: '[data-testid="deck.sidebar"] >> text="Assistant" >> nth=0', hud: false });
  }
  await demo.click({ selector: 'role=combobox[name="Remote language model"]', hud: false });
  await demo.click({ selector: `role=option[name="${model}"]`, hud: false });
  await page.locator('role=combobox[name="Remote language model"]', { hasText: model }).waitFor();
  await demo.click({ selector: '[data-testid="spacePlugin.space"] >> nth=0', hud: false });
};

/** The plugin the agent builds, as the template's tasks name it. */
const PLUGIN_NAME = 'World Clock';

/** The template's parent task; the agent finishes it as `done`, or `review` when its brief asks for sign-off. */
const PARENT_TASK = 'Build the World Clock plugin';

/** A beat for the viewer to read a card or a result. */
const LINGER = 2_500;

/** A plugin card in the registry list, by its key: earlier takes leave other World Clocks listed under their own keys. */
const card = (key) => `[data-testid="pluginList.${key}"]`;

const SPACE_TAB = '[data-testid="spacePlugin.space"]';

/** The browser flow's steps, by name, so this take keeps their selectors and waits. */
const step = (name) => {
  const found = browserSteps.find((candidate) => candidate.name === name);
  if (!found) {
    throw new Error(`plugin-dev-shell's flow has no step "${name}"`);
  }
  return found;
};

/** Whether the agent has finished the template's parent task, read from the space rather than the screen. */
const parentDone = ({ page }) =>
  page.evaluate(
    async ({ tab, title }) => {
      const spaceId = document.querySelector(tab)?.dataset.value?.split('/').pop();
      if (!spaceId || !globalThis.dxos?.spaces) {
        return false;
      }
      const tasks = await dxos
        .spaces(spaceId)
        .db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.task')))
        .run();
      return tasks.some((task) => task.title === title && ['done', 'review'].includes(task.status));
    },
    { tab: SPACE_TAB, title: PARENT_TASK },
  );

/** The key the template minted for this take's project, read from its "Write the plugin" task. */
const projectKey = async ({ page }) => {
  // Read from this take's own project: another Composer Plugin project in the space has a key of its own.
  const projectId = (await readFile(TAKE_PROJECT, 'utf8')).trim();
  return page.evaluate(
    async ({ tab, projectId }) => {
      const spaceId = document.querySelector(tab)?.dataset.value?.split('/').pop();
      const projects = await dxos
        .spaces(spaceId)
        .db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.project')))
        .run();
      const project = projects.find((candidate) => candidate.id === projectId);
      if (!project) {
        throw new Error(`project ${projectId} is not in the space`);
      }
      const taskSet = await project.taskSet?.load();
      const parents = await Promise.all((taskSet?.tasks ?? []).map((ref) => ref.load()));
      const subtasks = await Promise.all(parents.flatMap((parent) => parent.subtasks ?? []).map((ref) => ref.load()));
      const write = subtasks.find((task) => task.title === 'Write the plugin in TypeScript');
      const key = write?.description?.match(/org\.example\.plugin\.worldClock[0-9a-f]{8}/)?.[0];
      if (!key) {
        throw new Error('the project\'s "Write the plugin" task names no plugin key');
      }
      return key;
    },
    { tab: SPACE_TAB, projectId },
  );
};

const REGISTRY_TAB = '[data-testid="pluginRegistry.registry"]';

const OPEN_SIDEBAR = 'button:visible:has-text("Open sidebar")';

/**
 * Opens Plugins -> Registry, clicking only what is not already showing: Plugins toggles its sidebar shut, and a
 * collapsed sidebar's items still read as visible, so the sidebar is checked by its "Open sidebar" button.
 */
const openRegistry = async ({ demo, page }) => {
  const visible = (selector) =>
    page
      .locator(selector)
      .first()
      .isVisible()
      .catch(() => false);
  if (await visible(OPEN_SIDEBAR)) {
    await demo.click({ selector: OPEN_SIDEBAR, label: 'Open sidebar' });
    await page.waitForTimeout(500);
  }
  if (!(await visible(REGISTRY_TAB))) {
    await demo.click({ selector: '[data-testid="treeView.pluginRegistry"]', label: 'Plugins' });
    await page.waitForTimeout(1_000);
  }
  await page.locator(REGISTRY_TAB).first().waitFor({ state: 'visible', timeout: 15_000 });
  await demo.click({ selector: `${REGISTRY_TAB} >> nth=0`, label: 'Registry' });
};

/** Whether the plugin with this key is installed. */
const installed = ({ page }, key) =>
  page.evaluate((key) => composer.plugins().some((plugin) => plugin.id === key), key);

/** Whether this profile's identity was bound by an earlier take. */
const bound = ({ page }) =>
  page.evaluate((key) => localStorage.getItem(key) === globalThis.dxos?.client.halo.identity.get()?.did, BOUND_KEY);

export const steps = [
  step('Prep (off camera): clear the last take'),
  {
    // The sandbox's account token and the private registry both need an account; a `test+` email binds one.
    name: 'Prep (off camera): bind the identity to an EDGE account',
    setup: true,
    done: bound,
    run: async (context) => {
      const { page } = context;
      if (await bound(context)) {
        return;
      }
      const identity = await page.evaluate(() => {
        const current = globalThis.dxos.client.halo.identity.get();
        const hex = Array.from(current.identityKey.data, (byte) => byte.toString(16).padStart(2, '0')).join('');
        return { identityDid: current.did, identityKey: hex };
      });
      const { execFileSync } = await import('node:child_process');
      // curl, not fetch: it honours the sandbox's HTTPS proxy.
      const status = execFileSync(
        'curl',
        [
          '-sS',
          '-o',
          '/dev/null',
          '-w',
          '%{http_code}',
          '-X',
          'POST',
          '-H',
          'content-type: application/json',
          '-d',
          JSON.stringify({ ...identity, email: `test+qa-plugin-registry-${Date.now()}@dxos.org` }),
          `${HUB_URL}account/invitation-code/redeem`,
        ],
        { encoding: 'utf8' },
      );
      // Marked bound only on success, so a failed bind is retried rather than skipped by the next take.
      if (!status.startsWith('2')) {
        throw new Error(`binding the identity to an account failed with HTTP ${status}`);
      }
      await page.evaluate(([key, did]) => localStorage.setItem(key, did), [BOUND_KEY, identity.identityDid]);
      // The client caches its EDGE credential from before the binding.
      await page.reload({ timeout: 120_000 });
      // The space tab, not a plank: the clear step closes every plank.
      await page.locator(SPACE_TAB).first().waitFor({ state: 'visible', timeout: 180_000 });
      await page.waitForTimeout(BIND_SETTLE);
    },
  },
  {
    name: 'Prep (off camera): pick the model, dismiss notices',
    setup: true,
    run: async (context) => {
      await prepare(context, { codingDev: false });
      await pickModel(context, MODEL);
    },
  },
  {
    ...step('Create a project from the Composer Plugin template'),
    run: async (context) => {
      await context.demo.caption({
        value: 'Create a project from the Composer Plugin template',
        subtitle: 'plugin-projects QA-2',
      });
      await step('Create a project from the Composer Plugin template').run(context);
    },
  },
  {
    ...step("Open the project's tasks"),
    run: async (context) => {
      await context.demo.caption({ value: 'Delegate its tasks to the assistant', subtitle: 'plugin-projects QA-2' });
      await step("Open the project's tasks").run(context);
    },
  },
  step('Select the parent task and assign it to the agent'),
  step('Open the agent session'),
  step("Show the chat's tasks, then hide them"),
  {
    // The take's long stretch: the agent creates the sandbox (which mints the account token), then fetches the
    // guide, writes, installs, typechecks, builds and publishes. The trimmer cuts the still frames between.
    name: 'Wait for the agent to publish the plugin',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'The assistant builds World Clock and publishes it privately',
        subtitle: 'the sandbox it creates gets DX_API_TOKEN for this account',
      });
      await page.waitForTimeout(LINGER);
      // A quarter hour of streaming tool calls is motion the still-frame trim cannot cut, so it plays fast.
      await demo.speed({ factor: 30 });
      // Polled from here, not with `waitForFunction`: its predicate cannot await, and a returned promise is truthy.
      const deadline = Date.now() + TWENTY_FIVE_MIN;
      while (!(await parentDone({ page }))) {
        if (Date.now() > deadline) {
          throw new Error(`"${PARENT_TASK}" was not finished within 25 minutes`);
        }
        await page.waitForTimeout(5_000);
      }
      await demo.speed({ factor: 1 });
      await page.waitForTimeout(LINGER);
    },
    done: parentDone,
  },
  {
    // Nothing was loaded by URL: the private registry lists the plugin, and installing it (which also enables it) is
    // the reader's click.
    name: 'Install World Clock from the registry',
    done: async (context) => installed(context, await projectKey(context)),
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'World Clock appears in Plugins -> Registry; install it',
        subtitle: 'plugin-projects QA-2',
      });
      for (const label of ['Close companion', 'Close context sidebar']) {
        const button = page.locator(`button:has-text("${label}")`).first();
        if (await button.isVisible().catch(() => false)) {
          await demo.click({ selector: `button:has-text("${label}") >> nth=0`, label });
        }
      }
      await openRegistry({ demo, page });
      const key = await projectKey({ page });
      const plugin = page.locator(card(key)).first();
      await plugin.waitFor({ state: 'visible', timeout: 60_000 });
      await plugin.scrollIntoViewIfNeeded();
      await demo.hover({ selector: `${card(key)} >> nth=0`, label: PLUGIN_NAME });
      await page.waitForTimeout(LINGER);
      await demo.click({ selector: `${card(key)} >> nth=0 >> button:has-text("Install")`, label: 'Install' });
      await page.waitForFunction((key) => composer.plugins().some((plugin) => plugin.id === key), key, {
        timeout: 60_000,
      });
      await page.waitForTimeout(LINGER);
    },
  },
  {
    ...step('Open the Clocks page'),
    run: async (context) => {
      await context.demo.caption({ value: 'Open its Clocks page', subtitle: 'plugin-projects QA-2' });
      await step('Open the Clocks page').run(context);
    },
  },
  step('Add two timezones'),
  {
    // The round trip's last leg: the registry renders the spec the template seeded, read from the installed bundle.
    name: "Open World Clock's specification from the registry",
    narration:
      'The spec the project started from came back through the published bundle, so the registry shows exactly what the agent was asked to build.',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: "Open World Clock's specification from the registry",
        subtitle: 'the PLUGIN.mdl the template seeded, shipped in the bundle',
      });
      await openRegistry({ demo, page });
      const key = await projectKey({ page });
      const plugin = page.locator(card(key)).first();
      await plugin.waitFor({ state: 'visible', timeout: 60_000 });
      await plugin.scrollIntoViewIfNeeded();
      await demo.click({ selector: `${card(key)} >> nth=0 >> button:has-text("Details")`, label: 'Details' });
      const openSpec = 'button:text-is("Open Specification")';
      await page.locator(openSpec).first().waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(LINGER);
      await demo.click({ selector: `${openSpec} >> nth=0`, label: 'Open Specification' });
      const spec = page.locator('[data-testid="spec-article.spec"]').first();
      await spec.waitFor({ state: 'visible', timeout: 30_000 });
      // The seeded text, not just any spec: its component comes from the template and its id is this project's key.
      await page
        .locator(`[data-testid="spec-article.spec"]:has-text("ClocksArticle"):has-text("${key}")`)
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 });
      await demo.caption({
        value: 'The spec round-trips from the project template to the registry',
        subtitle: 'plugin-projects QA-2',
      });
      await page.waitForTimeout(10_000);
    },
  },
];
