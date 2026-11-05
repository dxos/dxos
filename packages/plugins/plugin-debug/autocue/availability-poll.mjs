//
// Copyright 2026 DXOS.org
//

/**
 * Availability Poll: the development loop at the spec and feature level. The template holds a finished spec staged as
 * three milestones, its feature map and design docs, and no tasks. Ask the project's chat to plan a milestone from
 * the spec, delegate the tasks it files and watch the Gantt chart and the feature cards: Prototype as each task runs
 * its feature in the sandbox, Operational once the milestone's scenario passes there and the Worker is deployed. A
 * person accepts the reviewed tasks. Then change a requirement on its card and watch the feature fail, get fixed and
 * recover. Flight options stay planned for the viewer. The take does not open the Worker itself.
 *
 * @title Availability Poll: from a spec to a Worker, milestone by milestone
 * @mdl packages/plugins/plugin-debug/PLUGIN.mdl test QA-11
 * @app composer-app dev server on :4173 (`DX_DEV=true DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run
 *   composer-app:serve`), talking to EDGE preview, whose AI and sandbox services serve the model below
 * @template Availability Poll
 *
 * The agent checks its work on `wrangler dev` in the sandbox and deploys with `wrangler deploy --temporary` once a
 * milestone's scenario passes, so no Cloudflare login is needed; the claim URL it prints is a bearer credential, so the
 * take never opens the chats.
 *
 * To keep the build off EDGE's sandboxes, serve local ones with `serve()` from `plugin-sandbox/src/local/server.ts`,
 * allowing `*.workers.dev` and `*.cloudflare.com` beside the default registries, and give the driver `DX_SANDBOX_URL`
 * and `DX_SANDBOX_TOKEN` (see `useLocalSandbox`).
 */

const TEMPLATE = 'Availability Poll';
const PROJECT = 'Availability Poll';

/** `DX_MODEL` picks another of the settings' remote models by label. */
const MODEL = process.env.DX_MODEL ?? 'Claude Sonnet 5';

const M1 = { id: 'M-1', features: ['Create a poll', 'Mark availability', 'Heat map and best slot'] };
const M2 = { id: 'M-2', features: ['Time zones', 'Daylight-saving time'] };
const HEATMAP = 'Heat map and best slot';
const FLIGHTS = 'Flight options';

const TIE_BREAK = 'F-3.2';
const NEW_TIE_BREAK =
  'The best slot is the one the most invitees are free for; on a tie, the one whose next slot keeps the most of the same invitees free, so the meeting can run over; then the earliest. With no marks there is no best slot.';

const planPrompt = (milestone) => `Plan ${milestone} from the spec.`;
const REVALIDATE_PROMPT = `I changed ${TIE_BREAK} on "${HEATMAP}". Revalidate it.`;

const FINISHED = ['done', 'review'];

/** Agent stretches play at this factor, with the trimmer's fast-forward badge on screen. */
const FAST = 60;

/** A beat for the viewer after a visible change. */
const BEAT = 1_500;

const TASK_ROW = '[data-testid="deck.plank"] [data-testid="taskList.item"]';
const taskRow = (title) => `${TASK_ROW}:has([data-testid="taskList.item.title"]:text-is("${title}"))`;
const PROJECT_NODE = `[data-testid="deck.sidebar"] [data-testid="spacePlugin.object"]:has(:text-is("${PROJECT}")) >> nth=0`;
const node = (name) => `[data-testid="feature-canvas-node"]:has-text("${name}") >> nth=0`;
const COMPANION = '[data-testid="feature-companion"]';
const DECK_COMPANION = '[data-testid="deck.companion"]';
const PROMPT = `${DECK_COMPANION} [data-testid="assistant.prompt"] .cm-content`;

/** Where the take's own space id is kept in the page, and in session storage so a reload keeps it. */
const TAKE_SPACE = '__availabilityPollSpace';

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

/**
 * The take's work as plain data, read from ECHO: each task with its status, its milestone's name and whether it is
 * assigned, and each feature's status and requirements. Only the take's space: a reused profile keeps earlier ones.
 */
const snapshot = (page) =>
  page
    .evaluate(async (key) => {
      const space = dxos
        .spaces()
        .find((candidate) => candidate.id === (globalThis[key] ??= sessionStorage.getItem(key) ?? undefined));
      if (!space) {
        return { tasks: [], features: {} };
      }
      const query = (typename) =>
        space.db
          .query(dxos.Filter.type(dxos.DXN.make(typename)))
          .run()
          .catch(() => []);
      const links = {};
      for (const link of await query('org.dxos.relation.implements')) {
        const source = dxos.Relation.getSource(link)?.id;
        links[source] = (links[source] ?? 0) + 1;
      }
      const tasks = await Promise.all(
        (await query('org.dxos.type.task')).map(async (task) => ({
          title: task.title,
          status: task.status,
          milestone: (await task.milestone?.load?.().catch(() => undefined))?.name ?? '',
          assigned: task.assignee !== undefined,
          features: links[task.id] ?? 0,
        })),
      );
      const features = Object.fromEntries(
        (await query('org.dxos.type.feature')).map((feature) => [
          feature.name,
          { status: feature.status, requirements: (feature.requirements ?? []).map(({ id, text }) => ({ id, text })) },
        ]),
      );
      return { tasks, features };
    }, TAKE_SPACE)
    .catch(() => ({ tasks: [], features: {} }));

const tasksOf = (state, milestone) => state.tasks.filter((task) => task.milestone.startsWith(milestone));
const allOperational = (state, names) => names.every((name) => state.features[name]?.status === 'operational');

/** The spec's text in the take's space. */
const specText = (page) =>
  page
    .evaluate(async (key) => {
      const space = dxos
        .spaces()
        .find((candidate) => candidate.id === (globalThis[key] ??= sessionStorage.getItem(key) ?? undefined));
      const specs = space
        ? await space.db
            .query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.projects.spec')))
            .run()
            .catch(() => [])
        : [];
      const spec = specs.find((candidate) => candidate.name === 'Availability Poll');
      return (await spec?.content?.load?.())?.content ?? '';
    }, TAKE_SPACE)
    .catch(() => '');

/** The Specs tab's views of the spec: its text, or its features as a map. */
const SPEC_VIEWS = { document: 'document', features: 'canvas' };

/**
 * Opens a tab of the project's plank: `overview`, `tasks`, or a view of the Specs tab — `document` for the spec's
 * text, `features` for its map.
 */
const openProjectTab = async (demo, page, tab) => {
  const view = SPEC_VIEWS[tab];
  const selector = `[data-testid="projectsPlugin.tab.${view ? 'spec' : tab}"]`;
  await showProjectTabs(demo, page, selector);
  await closeCompanion(page);
  if (!view) {
    await demo.click({ selector: `${selector} >> nth=0`, label: tab[0].toUpperCase() + tab.slice(1) });
    return;
  }
  if ((await page.locator(selector).first().getAttribute('aria-selected')) !== 'true') {
    await demo.click({ selector: `${selector} >> nth=0`, label: 'Specs' });
  }
  const toggle = `[data-testid="projectsPlugin.specView.${view}"]`;
  await page.locator(toggle).first().waitFor({ state: 'visible', timeout: 15_000 });
  if ((await page.locator(toggle).first().getAttribute('aria-checked')) !== 'true') {
    await demo.click({ selector: `${toggle} >> nth=0`, label: view === 'canvas' ? 'Map' : 'Document' });
  }
  if (view === 'canvas') {
    await page.getByTestId('feature-map.canvas').first().waitFor({ state: 'visible', timeout: 15_000 });
  } else {
    await page.getByTestId('projectsPlugin.spec.document').first().waitFor({ state: 'visible', timeout: 15_000 });
  }
};

/** Brings the project's plank up, at the project's own level, with its tabs showing. */
const showProjectTabs = async (demo, page, selector) => {
  // A feature's level or an artifact opened from the project sits under the project's breadcrumb, whose first link is
  // the project; the sidebar row does not navigate back. Other planks, such as Home, have breadcrumbs too.
  const crumb = `[data-testid="deck.plank"] nav[aria-label="Navigation history"] button[data-part="link"]:text-is("${PROJECT}")`;
  if (await visible(page.locator(crumb), 1_000)) {
    await demo.click({ selector: `${crumb} >> nth=0`, label: PROJECT });
  } else if (!(await visible(page.locator(selector), 2_000))) {
    await showProject(page);
    await demo.click({ selector: PROJECT_NODE, label: PROJECT });
  }
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 15_000 });
};

/** Selects the feature on its project's map, which opens it in the plank's feature companion. */
const openFeature = async (demo, page, name) => {
  await openProjectTab(demo, page, 'features');
  await page.locator(node(name)).waitFor({ state: 'visible', timeout: 15_000 });
  await demo.click({ selector: node(name), label: name });
  // The selection outlives a closed companion, so a card already selected needs the companion reopened.
  if (!(await visible(page.locator(COMPANION), 3_000))) {
    await demo.click({ selector: '[data-testid="plankHeading.companion"] >> nth=0', label: 'Companion' });
  }
  await page.locator(COMPANION).first().waitFor({ state: 'visible', timeout: 15_000 });
};

const DOCUMENT = '[data-testid="projectsPlugin.spec.document"]';

/**
 * Wheels the spec's text down a notch at a time, so the camera follows, until a line holding `text` is in the upper
 * part of the view or the text ends; the editor draws only the lines near the view, so the line cannot be scrolled to.
 */
const scrollDocumentTo = async (page, text) => {
  const box = await page.locator(DOCUMENT).first().boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const line = page.locator(`${DOCUMENT} .cm-line:has-text("${text}")`);
  let last;
  for (let notch = 0; notch < 200; notch++) {
    const top = (await line.count()) > 0 ? (await line.first().boundingBox())?.y : undefined;
    if (top !== undefined && (top < box.y + box.height * 0.4 || top === last)) {
      return;
    }
    last = top;
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(100);
  }
};

/** Types `text` into the project's chat, in the plank's Assistant companion, and sends it. */
const ask = async (demo, page, text) => {
  await openProjectTab(demo, page, 'tasks');
  if (!(await visible(page.locator(DECK_COMPANION), 2_000))) {
    await demo.click({
      selector: '[data-testid="deck.plank"] [data-testid="plankHeading.companion"] >> nth=0',
      label: 'Companion',
    });
  }
  const tab = `${DECK_COMPANION} [data-testid="deck.companion.tab.assistant-chat"]`;
  await page.locator(tab).first().waitFor({ state: 'visible', timeout: 15_000 });
  await demo.click({ selector: `${tab} >> nth=0`, label: 'Assistant' });
  await page.locator(PROMPT).first().waitFor({ state: 'visible', timeout: 15_000 });
  await demo.click({ selector: `${PROMPT} >> nth=0`, hud: false });
  await page.keyboard.type(text, { delay: 35 });
  await page.waitForTimeout(BEAT / 2);
  await page.keyboard.press('Enter');
};

/** Polls the take's work until `done` holds, fast-forwarded, failing with the last snapshot after `minutes`. */
const waitFor = async (demo, page, done, minutes, label) => {
  await demo.speed({ factor: FAST });
  const deadline = Date.now() + minutes * 60_000;
  for (;;) {
    const state = await snapshot(page);
    if (await done(state)) {
      break;
    }
    if (Date.now() > deadline) {
      await demo.speed({ factor: 1 });
      throw new Error(`${label} not finished in ${minutes} minutes: ${JSON.stringify(state)}`);
    }
    await page.waitForTimeout(10_000);
  }
  await demo.speed({ factor: 1 });
};

/**
 * Whether the agent has filed the milestone's tasks and linked them: the check task links to every feature the others
 * do, last, so a check task linked to as many features as there are other tasks means the plan is complete.
 */
const planned = (milestone) => (state) => {
  const tasks = tasksOf(state, milestone);
  const check = tasks.find((task) => /^check/i.test(task.title));
  const others = tasks.filter((task) => task !== check);
  return check !== undefined && others.length > 0 && others.every((task) => task.features > 0) && check.features >= others.length;
};

/** Ticks the named rows and assigns them to the agent as one chat. */
const delegate = async (demo, page, titles) => {
  await openProjectTab(demo, page, 'tasks');
  for (const title of titles) {
    await page.locator(taskRow(title)).first().waitFor({ state: 'visible', timeout: 15_000 });
    await demo.click({ selector: `${taskRow(title)} >> [data-testid="taskList.item.checkbox"]`, label: title });
  }
  await demo.click({ selector: '[data-testid="projectsPlugin.delegateTasks"]', label: 'Delegate to agent' });
  await page.getByTestId('projectsPlugin.pipeline.chart').first().waitFor({ state: 'visible', timeout: 30_000 });
  await closeCompanion(page);
};

/** Delegates every open task of the milestone. */
const delegateMilestone = async (demo, page, milestone) => {
  const titles = tasksOf(await snapshot(page), milestone)
    .filter((task) => !FINISHED.includes(task.status))
    .map((task) => task.title);
  await delegate(demo, page, titles);
};

const STATUS_LABEL = { failing: 'Failing', operational: 'Operational', planned: 'Planned', prototype: 'Prototype' };

/** The Tasks tab scrolled to the Gantt chart. */
const showGantt = async (demo, page) => {
  await openProjectTab(demo, page, 'tasks');
  await page
    .getByTestId('projectsPlugin.pipeline.chart')
    .first()
    .scrollIntoViewIfNeeded()
    .catch(() => {});
};

/**
 * Holds the camera on the Gantt chart while the milestone's tasks run. Each time one of its features changes status,
 * cuts to the feature map at normal speed to show the card, then goes back. Ends once every task is finished and every
 * feature operational.
 */
const watchMilestone = async (demo, page, milestone, minutes) => {
  await showGantt(demo, page);
  let seen;
  await waitFor(
    demo,
    page,
    async (state) => {
      const statuses = Object.fromEntries(milestone.features.map((name) => [name, state.features[name]?.status]));
      const changed = seen ? milestone.features.filter((name) => statuses[name] !== seen[name]) : [];
      seen = statuses;
      const tasks = tasksOf(state, milestone.id);
      const finished = tasks.length > 0 && tasks.every((task) => FINISHED.includes(task.status));
      if (changed.length > 0) {
        await demo.speed({ factor: 1 });
        await openProjectTab(demo, page, 'features');
        await demo.caption({
          value: changed.map((name) => `${name}: ${STATUS_LABEL[statuses[name]] ?? statuses[name]}`).join(' · '),
          subtitle: statuses[changed[0]] === 'prototype' ? 'Running in its sandbox' : 'Checked, then deployed',
        });
        await page.waitForTimeout(BEAT * 2);
        if (!finished || !allOperational(state, milestone.features)) {
          await showGantt(demo, page);
          await demo.speed({ factor: FAST });
        }
      }
      return finished && allOperational(state, milestone.features);
    },
    minutes,
    `${milestone.id}'s tasks and features`,
  );
  await openProjectTab(demo, page, 'features');
  await page.waitForTimeout(BEAT);
};

/** A person signs off each of the milestone's tasks in review, from its status control on the Tasks tab. */
const acceptMilestone = async (demo, page, milestone) => {
  await openProjectTab(demo, page, 'tasks');
  const titles = tasksOf(await snapshot(page), milestone)
    .filter((task) => task.status === 'review')
    .map((task) => task.title);
  for (const title of titles) {
    await demo.click({ selector: `${taskRow(title)} >> [data-testid="taskList.item.status"]`, label: title });
    await demo.click({ selector: 'role=menuitemradio[name="Done"]', label: 'Done' });
  }
  await page.waitForFunction(
    async ({ key, titles }) => {
      const space = dxos
        .spaces()
        .find((candidate) => candidate.id === (globalThis[key] ??= sessionStorage.getItem(key) ?? undefined));
      const tasks = await space.db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.task'))).run();
      return tasks.filter((task) => titles.includes(task.title)).every((task) => task.status === 'done');
    },
    { key: TAKE_SPACE, titles },
    { timeout: 15_000 },
  );
  await page.waitForTimeout(BEAT);
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
    name: 'Prep (off camera): dismiss notices, hide help panels, pick the model',
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
        // The input is visually hidden; its switch label takes the click.
        await hideHelp.locator('xpath=ancestor::label[1]').click();
        for (let attempt = 0; attempt < 20 && !(await hideHelp.isChecked()); attempt++) {
          await page.waitForTimeout(250);
        }
      }
      // A delegated chat runs on the settings' default model, not the chat picker's.
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
    name: 'Create a space from the Availability Poll template',
    done: async ({ page }) =>
      page.evaluate((key) => Boolean(globalThis[key] ?? sessionStorage.getItem(key)), TAKE_SPACE).catch(() => false),
    run: async ({ demo, page }) => {
      await demo.title({
        value: 'Availability Poll',
        subtitle: 'From a spec to a Worker, milestone by milestone',
        hold: 3_600,
      });
      await demo.caption({ value: 'Start from the Availability Poll template' });
      await demo.click({ selector: '[data-testid="spacePlugin.addSpace"]', label: 'Add space' });
      await demo.click({ selector: 'role=menuitem[name="Create space"]', label: 'Create space' });
      // The list fills in as plugins contribute their templates, and a click during that re-render selects nothing.
      const option = `[data-testid="create-space-dialog"] [role="option"]:has-text("${TEMPLATE}")`;
      const selected = page.locator(`${option}[aria-selected="true"]`);
      for (let attempt = 0; attempt < 4 && !(await visible(selected, 1_500)); attempt++) {
        await demo.click({ selector: option, label: TEMPLATE });
      }
      await selected.first().waitFor({ state: 'visible', timeout: 5_000 });
      await page.waitForTimeout(BEAT);
      const before = await page.evaluate(() => dxos.spaces().map((space) => space.id));
      await demo.click({ selector: '[data-testid="create-space-dialog"] button:has-text("Create")', label: 'Create' });
      await page.waitForFunction(
        ({ before, key }) => {
          const created = dxos.spaces().find((space) => !before.includes(space.id));
          if (created) {
            globalThis[key] = created.id;
            sessionStorage.setItem(key, created.id);
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
    name: 'Open the feature map',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'A finished spec: six features, all planned', subtitle: 'And no tasks yet' });
      await openProjectTab(demo, page, 'tasks');
      await page.waitForTimeout(BEAT);
      await openProjectTab(demo, page, 'features');
      await page.locator(node(HEATMAP)).waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Open the spec',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Each feature is a block of the spec', subtitle: 'Staged as milestones M-1 to M-3' });
      await openFeature(demo, page, HEATMAP);
      await page.waitForTimeout(BEAT * 2);
      await openProjectTab(demo, page, 'document');
      await page.waitForTimeout(BEAT * 2);
      // Down to the milestones and the DST scenario, the part a reader checks the build against.
      for (const heading of ['M-1: Core poll', 'scenario T-2']) {
        await scrollDocumentTo(page, heading);
        await page.waitForTimeout(BEAT * 2);
      }
    },
  },
  {
    name: 'Open the flight options spec',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'The last milestone is a spec of its own', subtitle: 'It builds on the poll spec' });
      await openFeature(demo, page, FLIGHTS);
      await page.waitForTimeout(BEAT);
      await demo.click({ selector: `${COMPANION} [data-testid="feature-companion.zoom"]`, label: 'Show subfeatures' });
      await page.locator(node('Offer search')).waitFor({ state: 'visible', timeout: 10_000 });
      await closeCompanion(page);
      await page.waitForTimeout(BEAT * 3);
      await openProjectTab(demo, page, 'features');
    },
  },
  {
    name: 'Plan M-1 from the spec',
    done: async ({ page }) => tasksOf(await snapshot(page), M1.id).length >= 3,
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Ask the agent to plan the first milestone' });
      await ask(demo, page, planPrompt(M1.id));
      await page.waitForTimeout(BEAT);
      await closeCompanion(page);
      await openProjectTab(demo, page, 'tasks');
      await waitFor(demo, page, planned(M1.id), 3, 'the M-1 plan');
      await demo.caption({
        value: 'One task per feature, then a check',
        subtitle: 'Each linked to the feature it moves',
      });
      await page.waitForTimeout(BEAT * 3);
    },
  },
  {
    name: 'Delegate M-1',
    done: async ({ page }) => tasksOf(await snapshot(page), M1.id).some((task) => task.assigned),
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Hand M-1 to the agent' });
      await delegateMilestone(demo, page, M1.id);
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Watch M-1 ship',
    done: async ({ page }) => allOperational(await snapshot(page), M1.features),
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'The agent builds, deploys and checks M-1',
        subtitle: 'In a sandbox, fast-forwarded',
        // The Gantt chart fills the foot of the plank, where a caption would sit.
        position: 'top',
      });
      await watchMilestone(demo, page, M1, 20);
      await demo.caption({ value: 'M-1 checked and deployed: three features operational' });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Accept M-1',
    done: async ({ page }) => tasksOf(await snapshot(page), M1.id).every((task) => task.status === 'done'),
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Sign off the work', subtitle: 'A delegated task waits in review for its person' });
      await acceptMilestone(demo, page, M1.id);
    },
  },
  {
    name: 'Plan and delegate M-2',
    done: async ({ page }) => tasksOf(await snapshot(page), M2.id).some((task) => task.assigned),
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Next: time zones and daylight-saving time' });
      await ask(demo, page, planPrompt(M2.id));
      await page.waitForTimeout(BEAT);
      await closeCompanion(page);
      await openProjectTab(demo, page, 'tasks');
      await waitFor(demo, page, planned(M2.id), 10, 'the M-2 plan');
      await page.waitForTimeout(BEAT * 2);
      await demo.caption({ value: 'Hand M-2 to the agent' });
      await delegateMilestone(demo, page, M2.id);
    },
  },
  {
    name: 'Watch M-2 ship',
    done: async ({ page }) => allOperational(await snapshot(page), M2.features),
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Three invitees, three zones, two clock changes',
        subtitle: 'Checked against the scenario before it deploys',
        position: 'top',
      });
      await watchMilestone(demo, page, M2, 40);
      await demo.caption({ value: 'M-2 checked: five features operational' });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Accept M-2',
    done: async ({ page }) => tasksOf(await snapshot(page), M2.id).every((task) => task.status === 'done'),
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Sign off M-2' });
      await acceptMilestone(demo, page, M2.id);
    },
  },
  {
    name: 'Change the tie-break',
    done: async ({ page }) =>
      (await snapshot(page)).features[HEATMAP]?.requirements.some(
        ({ id, text }) => id === TIE_BREAK && text === NEW_TIE_BREAK,
      ) ?? false,
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Change a requirement',
        subtitle: `${TIE_BREAK}: a tie goes to the slot that can run over`,
      });
      await openFeature(demo, page, HEATMAP);
      // The requirement is a text field of the feature's form, found by its current text.
      const field = page.locator(`${COMPANION} :is(textarea, input[type="text"], input:not([type]))`);
      const count = await field.count();
      let index = -1;
      for (let candidate = 0; candidate < count; candidate++) {
        if (
          (
            await field
              .nth(candidate)
              .inputValue()
              .catch(() => '')
          ).startsWith('The best slot is')
        ) {
          index = candidate;
          break;
        }
      }
      if (index < 0) {
        throw new Error(`no field holds ${TIE_BREAK} in the feature companion`);
      }
      await field.nth(index).scrollIntoViewIfNeeded();
      await field.nth(index).click();
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
      await page.keyboard.type(NEW_TIE_BREAK, { delay: 20 });
      await page.keyboard.press('Tab');
      await page.waitForFunction(
        async ({ key, text }) => {
          const space = dxos
            .spaces()
            .find((candidate) => candidate.id === (globalThis[key] ??= sessionStorage.getItem(key) ?? undefined));
          const features = await space.db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.feature'))).run();
          return features.some((feature) =>
            (feature.requirements ?? []).some((requirement) => requirement.text === text),
          );
        },
        { key: TAKE_SPACE, text: NEW_TIE_BREAK },
        { timeout: 10_000 },
      );
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Revalidate',
    done: async ({ page }) => {
      const state = await snapshot(page);
      return state.features[HEATMAP]?.status === 'failing' && state.tasks.some((task) => !task.assigned);
    },
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Ask the agent to revalidate it' });
      await ask(demo, page, REVALIDATE_PROMPT);
      await page.waitForTimeout(BEAT);
      await closeCompanion(page);
      await openProjectTab(demo, page, 'features');
      await waitFor(demo, page, (state) => state.features[HEATMAP]?.status === 'failing', 30, 'the revalidation');
      await demo.caption({ value: 'The Worker no longer meets it: failing' });
      await page.waitForTimeout(BEAT * 2);
      // The fix task is the one filed after the change, unassigned until it is delegated.
      await waitFor(demo, page, (state) => state.tasks.some((task) => !task.assigned), 15, 'the fix task');
      const text = await specText(page);
      if (!/best slot is s8/.test(text)) {
        throw new Error("the revalidation left T-2's best slot at s3");
      }
    },
  },
  {
    name: 'Ship the fix',
    done: async ({ page }) => {
      const state = await snapshot(page);
      return (
        state.features[HEATMAP]?.status === 'operational' && state.tasks.every((task) => FINISHED.includes(task.status))
      );
    },
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Hand the fix to the agent' });
      const fix = (await snapshot(page)).tasks.filter((task) => !task.assigned).map((task) => task.title);
      await delegate(demo, page, fix);
      await demo.caption({
        value: 'It changes the code, checks again and redeploys',
        subtitle: 'Fast-forwarded',
        position: 'top',
      });
      await openProjectTab(demo, page, 'features');
      await waitFor(
        demo,
        page,
        (state) =>
          state.features[HEATMAP]?.status === 'operational' &&
          state.tasks.filter((task) => fix.includes(task.title)).every((task) => FINISHED.includes(task.status)),
        20,
        'the fix',
      );
      await page.waitForTimeout(BEAT * 2);
      await acceptMilestone(demo, page, M1.id);
    },
  },
  {
    name: 'Hold on the feature map',
    narration: 'Five features operational, checked before each deploy; flight options are left to build.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Five features operational; flight options are yours to build' });
      await openProjectTab(demo, page, 'features');
      await page.waitForTimeout(BEAT * 3);
      await demo.caption({ value: 'The spec records the change', subtitle: "T-2's best slot is now s8" });
      await openProjectTab(demo, page, 'document');
      await scrollDocumentTo(page, 'decision D-2');
      await page.waitForTimeout(BEAT * 4);
    },
  },
];
