//
// Copyright 2026 DXOS.org
//

/**
 * Availability Poll: the development loop at the spec and feature level. The template holds a finished spec staged as
 * four milestones, its feature map and design docs, and no tasks. Ask the project's chat to plan a milestone from
 * the spec, delegate the tasks it files and watch the Gantt chart and the feature cards: Prototype as each task runs
 * its feature in the sandbox, Operational once the milestone's scenario passes there and the Worker is deployed. A
 * person accepts the reviewed tasks. Then change a requirement on its card and watch the feature fail, get fixed and
 * recover. Flight options stay planned for the viewer. After each milestone the take pulls the agent's code from the
 * sandbox, serves it on this machine with `wrangler dev`, runs the milestone's scenario against it and shows its pages,
 * all in windows drawn over the app. Then it opens the spec review the agent's check recorded, whose verdicts also mark
 * each requirement on the spec's feature cards, before the person signs off.
 *
 * @title Availability Poll: from a spec to a Worker, milestone by milestone
 * @mdl packages/plugins/plugin-debug/PLUGIN.mdl test QA-11
 * @app composer-app dev server on :4173 (`DX_DEV=true DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run
 *   composer-app:serve`), talking to EDGE preview, whose AI and sandbox services serve the model below
 * @template Availability Poll
 *
 * The agent checks its work on `wrangler dev` in the sandbox and deploys with `wrangler deploy --temporary` once a
 * milestone's scenario passes, so no Cloudflare login is needed; the claim URL it prints is a bearer credential, so the
 * take never opens a chat after the first deploy. `DX_POLL_BUILDS` is where the pulled code is built (default
 * `~/.cache/availability-poll-builds`), and `DX_POLL_NODE_MODULES` an installed `node_modules` to seed each build with.
 *
 * To keep the build off EDGE's sandboxes, serve local ones with `serve()` from `plugin-sandbox/src/local/server.ts`,
 * allowing `*.workers.dev` and `*.cloudflare.com` beside the default registries, and give the driver `DX_SANDBOX_URL`
 * and `DX_SANDBOX_TOKEN` (see `useLocalSandbox`).
 */

import { execFile, spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const TEMPLATE = 'Availability Poll';
const PROJECT = 'Availability Poll';

/** `DX_MODEL` picks another of the settings' remote models by label. */
const MODEL = process.env.DX_MODEL ?? 'Claude Sonnet 5';

const M1 = { id: 'M-1', features: ['Create a poll', 'Mark availability', 'Heat map and best slot'] };
const M2 = { id: 'M-2', features: ['New poll page', 'Poll page'] };
const HEATMAP = 'Heat map and best slot';
const DESIGN_DOC = 'One Durable Object per poll';

const POLL_PAGE = 'Poll page';
const ROSTER = 'F-5.6';
const ROSTER_PREFIX = 'Below the grids a roster';
const NEW_ROSTER =
  'Below the grids a roster lists every respondent as a tag with how many slots they marked, most marks first and ties in the order they answered, and marks the reader; before anyone answers it says "Nobody has answered yet".';

// Plans have left out the milestone's check, or its links, which the instructions ask for, so the prompt names both.
const planPrompt = (milestone) =>
  `Plan ${milestone} from the spec: a task per feature, then Check ${milestone} linked to each of those features.`;
// A revalidation has stopped at recording a diverged verdict, so the prompt names the steps the instructions give.
const REVALIDATE_PROMPT = `I changed ${ROSTER} on "${POLL_PAGE}". Revalidate it; if it fails, set the feature to failing and file the fix task.`;

const FINISHED = ['done', 'review'];

/** Agent stretches play at this factor, with the trimmer's fast-forward badge on screen. */
const FAST = 60;

/** A beat for the viewer after a visible change. */
const BEAT = 1_500;

/** The planning chat plays a little faster than life, so its tool calls can still be read. */
const PLAN_SPEED = 4;

const TASK_ROW = '[data-testid="deck.plank"] [data-testid="taskList.item"]';
const taskRow = (title) => `${TASK_ROW}:has([data-testid="taskList.item.title"]:text-is("${title}"))`;
const PROJECT_NODE = `[data-testid="deck.sidebar"] [data-testid="spacePlugin.object"]:has(:text-is("${PROJECT}")) >> nth=0`;
// By the whole name: "Poll page" is also part of "New poll page".
const node = (name) => `[data-testid="feature-canvas-node"]:has(:text-is("${name}")) >> nth=0`;
const COMPANION = '[data-testid="feature-companion"]';
const ARTIFACTS = '[data-testid="projectsPlugin.artifacts"]';
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
          {
            status: feature.status,
            // Requirements are stored by key, in `requirementOrder`'s order.
            requirements: (feature.requirementOrder ?? []).map((key) => {
              const { id, text } = feature.requirements[key];
              return { id, text };
            }),
          },
        ]),
      );
      return { tasks, features };
    }, TAKE_SPACE)
    .catch(() => ({ tasks: [], features: {} }));

const tasksOf = (state, milestone) => state.tasks.filter((task) => task.milestone.startsWith(milestone));
const allOperational = (state, names) => names.every((name) => state.features[name]?.status === 'operational');

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
  // The companion button's tooltip, left up by the pointer that closed the companion, covers the view toggles.
  const plank = await page.locator('[data-testid="deck.plank"]').first().boundingBox();
  await page.mouse.move(plank.x + plank.width / 2, plank.y + plank.height / 2);
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
 * Wheels the spec's text down a notch at a time, so the camera follows, until a line holding `text` (or, when `exact`,
 * a line of just `text`, such as a feature card's name) is in the upper part of the view or the text ends; the editor
 * draws only the lines near the view, so the line cannot be scrolled to. `delay` between notches sets the pace.
 */
const scrollDocumentTo = async (page, text, { exact = false, delay = 250 } = {}) => {
  const box = await page.locator(DOCUMENT).first().boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const line = page.locator(`${DOCUMENT} .cm-line:${exact ? 'text-is' : 'has-text'}("${text}")`);
  let last;
  for (let notch = 0; notch < 200; notch++) {
    const top = (await line.count()) > 0 ? (await line.first().boundingBox())?.y : undefined;
    const above = top !== undefined && top < box.y;
    if (top !== undefined && !above && (top < box.y + box.height * 0.4 || top === last)) {
      return;
    }
    last = top;
    await page.mouse.wheel(0, above ? -120 : 120);
    await page.waitForTimeout(delay);
  }
};

/** Delegating makes the build chat the project's chat; this gives the project a new, empty one. */
const freshChat = (page) =>
  page.evaluate(async (key) => {
    const space = dxos
      .spaces()
      .find((candidate) => candidate.id === (globalThis[key] ??= sessionStorage.getItem(key) ?? undefined));
    const [project] = await space.db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.project'))).run();
    await composer.invoke(
      'org.dxos.operation.assistant.setCurrentChat',
      { companionTo: project },
      { spaceId: space.id },
    );
  }, TAKE_SPACE);

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
  // A build chat reports its deploy's claim URL, a credential; a take that shows one is not published.
  if (/claim/i.test(await page.locator(DECK_COMPANION).first().innerText())) {
    throw new Error('The project chat shows a claim URL');
  }
  await demo.click({ selector: `${PROMPT} >> nth=0`, hud: false });
  await page.keyboard.type(text, { delay: 35 });
  await page.waitForTimeout(BEAT / 2);
  await page.keyboard.press('Enter');
};

/**
 * Polls the take's work until `done` holds, sped up by `factor`, failing with the last snapshot after `minutes`.
 */
const waitFor = async (demo, page, done, minutes, label, factor = FAST) => {
  await demo.speed({ factor });
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
  return (
    check !== undefined &&
    others.length > 0 &&
    others.every((task) => task.features > 0) &&
    check.features >= others.length
  );
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
 * Holds the camera on the task list and Gantt chart while the milestone's tasks run, captioning each task as it
 * finishes. Ends once every task is finished and every feature operational, on the feature map.
 */
const watchMilestone = async (demo, page, milestone, minutes) => {
  await showGantt(demo, page);
  let seen;
  await waitFor(
    demo,
    page,
    async (state) => {
      const tasks = tasksOf(state, milestone.id);
      const done = tasks.filter((task) => FINISHED.includes(task.status)).map((task) => task.title);
      const added = seen ? done.filter((title) => !seen.includes(title)) : [];
      seen = done;
      const finished = tasks.length > 0 && done.length === tasks.length;
      if (added.length > 0 && !finished) {
        await demo.speed({ factor: 1 });
        await demo.caption({ value: `${added.join(' · ')}: in review`, position: 'top' });
        await page.waitForTimeout(BEAT * 2);
        await demo.speed({ factor: FAST });
      }
      return finished && allOperational(state, milestone.features);
    },
    minutes,
    `${milestone.id}'s tasks and features`,
  );
  await demo.caption({ value: `Every ${milestone.id} task in review`, position: 'top' });
  await page.waitForTimeout(BEAT * 2);
  await openProjectTab(demo, page, 'features');
  await page.waitForTimeout(BEAT);
};

/**
 * A person signs off every task of the milestone in review at once, through the operation the status control's Done
 * runs, so the list goes from all in review to all done in one beat. The caption shows once the list is on screen.
 */
const acceptMilestone = async (demo, page, milestone, caption) => {
  await openProjectTab(demo, page, 'tasks');
  if (caption) {
    await demo.caption(caption);
  }
  const titles = tasksOf(await snapshot(page), milestone)
    .filter((task) => task.status === 'review')
    .map((task) => task.title);
  await page.waitForTimeout(BEAT * 2);
  await page.evaluate(
    async ({ key, titles }) => {
      const space = dxos
        .spaces()
        .find((candidate) => candidate.id === (globalThis[key] ??= sessionStorage.getItem(key) ?? undefined));
      const tasks = await space.db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.task'))).run();
      for (const task of tasks.filter((task) => titles.includes(task.title))) {
        await composer.invoke('org.dxos.operation.tasks.accept', { task: dxos.Ref.make(task) }, { spaceId: space.id });
      }
    },
    { key: TAKE_SPACE, titles },
  );
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
 * The review the milestone's check recorded, in the Spec companion's Review view, read card by card, then its verdicts
 * on the spec's feature cards from the first feature to the milestone's last.
 */
const readReview = async (demo, page, milestone, { features = milestone.features } = {}) => {
  await openProjectTab(demo, page, 'document');
  // The companion button reopens the last tab, which after a delegation is the build chat and its claim URL; the
  // Spec companion opens directly instead, and the project gets an empty chat in case anything shows the chat tab.
  await freshChat(page);
  await page.evaluate(() => composer.invoke('org.dxos.operation.appToolkit.updateCompanion', { subject: '~spec' }));
  const tab = `${DECK_COMPANION} [data-testid="deck.companion.tab.spec"][aria-selected="true"]`;
  await page.locator(tab).first().waitFor({ state: 'visible', timeout: 15_000 });
  const view = '[data-testid="spec-article.view.review"]';
  await page.locator(view).first().waitFor({ state: 'visible', timeout: 15_000 });
  if ((await page.locator(view).first().getAttribute('aria-checked')) !== 'true') {
    await demo.click({ selector: `${view} >> nth=0`, label: 'Review' });
  }
  await page.getByTestId('verdict-card').first().waitFor({ state: 'visible', timeout: 15_000 });
  await demo.caption({
    value: `The agent's review of ${milestone.id}`,
    subtitle: 'A verdict for each requirement and the scenario',
    hold: BEAT * 4,
  });
  // The current status takes each item's verdict from its newest review, so the counts cover every milestone so far.
  const statuses = await page
    .getByTestId('verdict-card')
    .evaluateAll((cards) => cards.map((card) => card.getAttribute('data-status')));
  const done = statuses.filter((status) => status === 'done').length;
  const open = statuses.length - done;
  await demo.caption(
    open > 0
      ? {
          value: `${done} done, ${open} untested`,
          subtitle: 'Untested: built, but no check covers it yet',
          hold: BEAT * 3,
        }
      : { value: `All ${done} verdicts done`, subtitle: 'A check covers every requirement', hold: BEAT * 3 },
  );
  await wheel(page, `${DECK_COMPANION} [data-testid="review-panel"]`, 8, { delay: 600 });
  await page.waitForTimeout(BEAT);
  await demo.caption({
    value: 'The verdicts show in the spec itself',
    subtitle: 'A tag on each requirement it judged',
    hold: BEAT * 2,
  });
  // The text above the features is not what this beat reads, so the scroll to them is quick.
  await scrollDocumentTo(page, features[0], { exact: true, delay: 100 });
  await page.waitForTimeout(BEAT * 3);
  for (const feature of features.slice(1)) {
    await scrollDocumentTo(page, feature, { exact: true });
    await page.waitForTimeout(BEAT * 2);
  }
  if (open === 0) {
    await demo.caption({
      value: 'Nothing left untested',
      subtitle: 'Every requirement built so far is checked',
      hold: BEAT * 3,
    });
  }
  await closeCompanion(page);
};

/** Wheels the plank's content down `notches` at a time, `delay` ms apart, so the camera follows the scroll. */
const wheel = async (page, selector, notches, { delay = 120 } = {}) => {
  const box = await page.locator(selector).first().boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let notch = 0; notch < notches; notch++) {
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(delay);
  }
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

const BUILDS = process.env.DX_POLL_BUILDS ?? join(homedir(), '.cache', 'availability-poll-builds');
const LOCAL_PORT = 8799;
const LOCAL = `http://127.0.0.1:${LOCAL_PORT}`;

/** The take's environment without the Cloudflare account, so nothing local can reach it. */
const localEnv = () => {
  const env = { ...process.env };
  delete env.CLOUDFLARE_API_TOKEN;
  delete env.CLOUDFLARE_ACCOUNT_ID;
  return env;
};

const run = (command, args, cwd) =>
  promisify(execFile)(command, args, { cwd, env: localEnv(), maxBuffer: 64 * 1024 * 1024, timeout: 600_000 });

/** Runs a shell command in the take's sandbox, through the same operation the agent uses. */
const sandboxExec = (page, command) =>
  page.evaluate(
    async ({ key, command }) => {
      const space = dxos
        .spaces()
        .find((candidate) => candidate.id === (globalThis[key] ??= sessionStorage.getItem(key) ?? undefined));
      const sandboxes = await space.db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.sandbox'))).run();
      const sandbox = sandboxes.find((candidate) => candidate.name === 'availability-poll');
      return composer.invoke(
        'org.dxos.operation.sandbox.exec',
        { sandbox: dxos.Ref.make(sandbox), command, timeout: 290_000 },
        { spaceId: space.id },
      );
    },
    { key: TAKE_SPACE, command },
  );

/** Bytes of the archive read per exec; a sandbox caps an exec's output, so a whole tree in one read comes back empty. */
const PULL_CHUNK = 256 * 1024;

/** Copies the agent's working tree out of the sandbox, without its installs, builds and history, into a new directory. */
const pullBuild = async (page, milestone) => {
  const archive = '/tmp/poll-build.tgz';
  const packed = await sandboxExec(
    page,
    `cd /workspace/poll && tar czf ${archive} --exclude=./node_modules --exclude=./.wrangler --exclude=./dist ` +
      `--exclude=./.git . && wc -c < ${archive}`,
  );
  const size = Number(packed.stdout.trim());
  if (packed.exitCode !== 0 || !(size > 0)) {
    throw new Error(
      `The sandbox's working tree could not be packed (${packed.exitCode}): ${String(packed.stderr ?? '').slice(0, 400)}`,
    );
  }
  const chunks = [];
  for (let offset = 0; offset < size; offset += PULL_CHUNK) {
    const { stdout, exitCode } = await sandboxExec(
      page,
      `dd if=${archive} bs=${PULL_CHUNK} skip=${offset / PULL_CHUNK} count=1 2>/dev/null | base64 -w0`,
    );
    if (exitCode !== 0) {
      throw new Error(`The sandbox's archive could not be read at ${offset} (${exitCode})`);
    }
    chunks.push(Buffer.from(stdout.trim(), 'base64'));
  }
  const bytes = Buffer.concat(chunks);
  if (bytes.length !== size) {
    throw new Error(`Read ${bytes.length} of the archive's ${size} bytes`);
  }
  const dir = join(BUILDS, `${milestone}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}.tgz`, bytes);
  await run('tar', ['xzf', `${dir}.tgz`, '-C', dir]);
  rmSync(`${dir}.tgz`);
  if (!existsSync(join(dir, 'package.json'))) {
    throw new Error(`The sandbox's /workspace/poll has no package.json; see ${dir}`);
  }
  return dir;
};

/** The local `wrangler dev`, kept between steps so the next milestone's build replaces it. */
let served;

const stopServing = () => {
  if (served) {
    try {
      process.kill(-served.pid, 'SIGTERM');
    } catch {}
    served = undefined;
  }
};
process.on('exit', stopServing);

/** Installs and builds the pulled code, then serves it with `wrangler dev` until it answers. */
const serveBuild = async (dir) => {
  stopServing();
  const seed = process.env.DX_POLL_NODE_MODULES;
  if (seed && existsSync(seed) && !existsSync(join(dir, 'node_modules'))) {
    cpSync(seed, join(dir, 'node_modules'), { recursive: true, verbatimSymlinks: true });
  }
  await run('npm', ['install', '--prefer-offline', '--no-audit', '--no-fund'], dir);
  // The agent may build in the sandbox with `vite build` and leave the package without a build script.
  const { scripts } = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  if (scripts?.build) {
    await run('npm', ['run', 'build'], dir);
  } else if (['js', 'mjs', 'ts'].some((ext) => existsSync(join(dir, `vite.config.${ext}`)))) {
    await run('npx', ['vite', 'build'], dir);
  }
  const log = openSync(join(dir, 'wrangler-dev.log'), 'a');
  served = spawn('npx', ['wrangler', 'dev', '--port', String(LOCAL_PORT), '--ip', '127.0.0.1'], {
    cwd: dir,
    env: localEnv(),
    detached: true,
    stdio: ['ignore', log, log],
  });
  for (let attempt = 0; attempt < 120; attempt++) {
    if (
      await fetch(LOCAL, { signal: AbortSignal.timeout(2_000) }).then(
        (response) => response.ok,
        () => false,
      )
    ) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`wrangler dev did not answer on ${LOCAL}; see ${join(dir, 'wrangler-dev.log')}`);
};

const T1 = {
  title: 'Design review',
  minutes: 60,
  slots: ['2026-06-01', '2026-06-02'].flatMap((date) => ['09', '10', '11', '12'].map((hour) => `${date}T${hour}:00Z`)),
  marks: { Ana: ['s1', 's2', 's3'], Ben: ['s2', 's3', 's6', 's7'], Chika: ['s3', 's6', 's7'] },
  free: [1, 2, 3, 0, 0, 2, 2, 0],
  best: { id: 's3', start: '2026-06-01T11:00Z' },
};

/**
 * Runs scenario T-1 against the local Worker as terminal lines, each a request or a check; `passed` says whether every
 * check held, and `id` is the poll it made.
 */
/** An instant to the minute, `2026-06-01T11:00Z`, however the Worker writes it. */
const minuteOf = (instant) => {
  const time = Date.parse(instant);
  return Number.isNaN(time) ? instant : new Date(time).toISOString().slice(0, 16) + 'Z';
};

const checkT1 = async () => {
  const api = async (path, method = 'GET', body) => {
    const response = await fetch(`${LOCAL}${path}`, {
      method,
      ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  };
  const lines = [];
  const created = await api('/api/polls', 'POST', { title: T1.title, minutes: T1.minutes, slots: T1.slots });
  const id = created.body?.id;
  lines.push({ text: `POST /api/polls  "${T1.title}", 8 slots  → ${created.status}` });
  for (const [name, slots] of Object.entries(T1.marks)) {
    const saved = await api(`/api/polls/${id}/marks/${name}`, 'PUT', { slots });
    lines.push({ text: `PUT  marks/${name.padEnd(6)}${slots.join(' ').padEnd(13)}→ ${saved.status}` });
  }
  const poll = (await api(`/api/polls/${id}`)).body ?? {};
  const best = poll.slots?.find((slot) => slot.id === poll.best);
  const checks = [
    // The order is the page's to choose, and the bonus change moves it.
    [
      'respondents',
      poll.respondents
        ?.map((respondent) => respondent.name)
        .sort()
        .join(', '),
      'Ana, Ben, Chika',
    ],
    ['free counts', poll.slots?.map((slot) => slot.free.length).join(' '), T1.free.join(' ')],
    ['best slot', best && `${best.id}, ${minuteOf(best.start)}`, `${T1.best.id}, ${T1.best.start}`],
  ];
  for (const [label, actual, expected] of checks) {
    lines.push({ text: `${label.padEnd(12)} ${actual ?? '—'}`, ok: actual === expected });
  }
  const passed = checks.every(([, actual, expected]) => actual === expected);
  return { id, passed, lines };
};

const WINDOW = 'autocue-window';

/**
 * Fills the screen, below the captions and cursor, with a terminal of `lines` typed in one by one or a browser on
 * `url`, so it cannot be mistaken for part of the app. Its title bar names what it shows.
 */
const openWindow = (page, { title, url }) =>
  page.evaluate(
    ({ id, title, url }) => {
      document.getElementById(id)?.remove();
      const frame = document.createElement('div');
      frame.id = id;
      frame.style.cssText =
        'position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;overflow:hidden;' +
        'background:#0d1117;font:20px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;color:#e6edf3';
      const bar = document.createElement('div');
      bar.style.cssText =
        'display:flex;align-items:center;gap:8px;padding:12px 18px;background:#161b22;border-bottom:1px solid #30363d;' +
        'font:15px system-ui,sans-serif;color:#8b949e';
      for (const color of ['#ff5f57', '#febc2e', '#28c840']) {
        const dot = document.createElement('span');
        dot.style.cssText = `width:12px;height:12px;border-radius:50%;background:${color}`;
        bar.append(dot);
      }
      const label = document.createElement('span');
      label.style.cssText = 'margin-left:10px';
      label.textContent = title;
      bar.append(label);
      frame.append(bar);
      if (url) {
        // The agent's pages take about half the frame's width, so the page is laid out smaller and scaled up to fill
        // it; CSS zoom would misplace its tooltips.
        const view = document.createElement('div');
        view.style.cssText = 'flex:1;position:relative;overflow:hidden';
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.cssText =
          'position:absolute;top:0;left:0;width:calc(100% / 1.5);height:calc(100% / 1.5);border:0;' +
          'background:#0d1117;transform:scale(1.5);transform-origin:0 0';
        view.append(iframe);
        frame.append(view);
        // The page is another site, which reaches the recording only when this page repaints; a title bar pixel that
        // changes every frame keeps the video in step with it.
        const pulse = document.createElement('span');
        pulse.style.cssText = 'width:1px;height:1px;margin-left:auto';
        bar.append(pulse);
        const beat = () => {
          if (pulse.isConnected) {
            pulse.style.background = pulse.style.background === 'rgb(22, 27, 34)' ? '#161b23' : '#161b22';
            requestAnimationFrame(beat);
          }
        };
        requestAnimationFrame(beat);
      } else {
        const body = document.createElement('pre');
        body.dataset.part = 'lines';
        body.style.cssText = 'flex:1;margin:0;padding:32px 40px;overflow:hidden;white-space:pre';
        frame.append(body);
      }
      document.body.append(frame);
    },
    { id: WINDOW, title, url },
  );

/** Adds a line to the open terminal window; `ok` marks it passed or failed. */
const printLine = (page, { text, ok }) =>
  page.evaluate(
    ({ id, text, ok }) => {
      const line = document.createElement('div');
      if (ok !== undefined) {
        const mark = document.createElement('span');
        mark.style.color = ok ? '#3fb950' : '#f85149';
        mark.textContent = ok ? '✓ ' : '✗ ';
        line.append(mark);
      }
      line.append(text);
      if (text.startsWith('$')) {
        line.style.color = '#79c0ff';
      }
      document.querySelector(`#${id} [data-part="lines"]`)?.append(line);
    },
    { id: WINDOW, text, ok },
  );

const closeWindow = (page) => page.evaluate((id) => document.getElementById(id)?.remove(), WINDOW);

/** The browser window's page, for driving the served build. */
const inWindow = (selector) => `#${WINDOW} iframe >> internal:control=enter-frame >> ${selector}`;

/** Opens the browser window on `url` and waits for its page to draw, since the first load of a build takes seconds. */
const openBrowser = async (page, { title, url }) => {
  await openWindow(page, { title, url });
  await page
    .locator(inWindow(':is(input, button, h1, h2)'))
    .first()
    .waitFor({ state: 'visible', timeout: 30_000 })
    .catch(() => {});
};

/**
 * Tags the cells of the grid in the poll page's card titled `title` as `data-autocue-cell="<prefix>-<column>-<row>"`,
 * and returns the grid's size, or nothing when the page has no such grid. The agent writes the page, so a grid's cells
 * are found as the card's largest set of equal boxes at least 2rem tall, which F-5.2 asks for, holding no day or time.
 */
const tagCells = (page, title, prefix) =>
  page
    .locator(inWindow('body'))
    .evaluate(
      (body, { title, prefix }) => {
        const heading = [...body.querySelectorAll('*')].find(
          (element) => element.childElementCount === 0 && element.textContent.trim().startsWith(title),
        );
        let card = heading;
        while (card?.parentElement && card.getBoundingClientRect().height < 120) {
          card = card.parentElement;
        }
        if (!card) {
          return undefined;
        }
        const sizes = {};
        for (const element of card.querySelectorAll('*')) {
          const { width, height } = element.getBoundingClientRect();
          if (height >= 24 && width >= 30 && !/\d{2}:\d{2}|[A-Z][a-z]{2} \d/.test(element.textContent)) {
            (sizes[`${Math.round(width)}x${Math.round(height)}`] ??= []).push(element);
          }
        }
        const cells = Object.values(sizes).sort((a, b) => b.length - a.length)[0] ?? [];
        if (cells.length < 4) {
          return undefined;
        }
        const edges = (axis) =>
          [...new Set(cells.map((cell) => Math.round(cell.getBoundingClientRect()[axis])))].sort((a, b) => a - b);
        const [xs, ys] = [edges('x'), edges('y')];
        for (const cell of cells) {
          const { x, y } = cell.getBoundingClientRect();
          cell.dataset.autocueCell = `${prefix}-${xs.indexOf(Math.round(x))}-${ys.indexOf(Math.round(y))}`;
        }
        return { columns: xs.length, rows: ys.length };
      },
      { title, prefix },
    )
    .catch(() => undefined);

const cell = (prefix, column, row) => inWindow(`[data-autocue-cell="${prefix}-${column}-${row}"]`);

/** Scrolls the poll page's roster into view and holds on it. */
const showRoster = async (demo, page, caption) => {
  await page
    .locator(inWindow(':text("Respondents")'))
    .first()
    .scrollIntoViewIfNeeded()
    .catch(() => {});
  await demo.caption({ ...caption, hold: BEAT * 4 });
  await page.waitForTimeout(BEAT * 4);
};

/**
 * Walks the T-1 poll as Ben, slowly enough to read: the two grids, a hover on the best slot for who is free, a drag down
 * Tuesday that marks it in one save, and the roster. A page without the grids, such as M-1's, is held on instead.
 */
const showPoll = async (demo, page) => {
  const yours = await tagCells(page, 'Your availability', 'yours');
  const group = await tagCells(page, 'Group availability', 'group');
  await demo.caption(
    group
      ? {
          value: "Ben's grid beside the group's",
          subtitle: 'Each slot shaded by how many are free; the best slot outlined',
          hold: BEAT * 4,
        }
      : {
          value: 'The heat map and the best slot',
          subtitle: "M-1's plain page; M-2 lays it out to the spec",
          hold: BEAT * 4,
        },
  );
  await page.waitForTimeout(BEAT * 4);
  if (group) {
    // T-1's best slot, s3, is Monday at 11:00: the first day's third row.
    await demo.hover({ selector: cell('group', 0, 2), label: 'Mon 11:00' });
    await demo.caption({ value: 'Hover a slot to see who is free', subtitle: 'Mon 11:00: all three', hold: BEAT * 3 });
    await page.waitForTimeout(BEAT * 3);
  }
  if (yours?.columns > 1) {
    await demo.caption({
      value: 'Ben drags down Tuesday',
      subtitle: 'Every cell it crosses is marked, then saved once',
      hold: BEAT * 4,
    });
    await demo.drag({
      from: cell('yours', 1, 0),
      to: cell('yours', 1, yours.rows - 1),
      label: 'Tuesday',
      steps: 30,
      stepDelay: 40,
    });
    await page.waitForTimeout(BEAT * 4);
  }
  if (group) {
    await showRoster(demo, page, {
      value: 'Everyone who answered',
      subtitle: 'How many slots each marked; Ben is the reader',
    });
  }
};

/**
 * Pulls the milestone's build from the sandbox and serves it here, fast-forwarded; then runs T-1 against it in a
 * terminal and opens the T-1 poll as Ben in a browser, after the new poll page unless `newPage` is false. `poll` walks
 * the T-1 poll.
 */
const tryLocally = async (
  demo,
  page,
  milestone,
  { caption = `Try ${milestone} on this machine`, newPage = true, poll = showPoll } = {},
) => {
  await demo.caption({
    value: caption,
    subtitle: "The agent's code, pulled from its sandbox",
    // The Gantt chart's captions sit at the top, where the served pages have their headings.
    position: 'bottom',
  });
  await demo.speed({ factor: FAST });
  // `DX_POLL_BUILD` re-serves a build pulled earlier, to re-record this step without building again.
  const dir = process.env.DX_POLL_BUILD ?? (await pullBuild(page, milestone));
  await serveBuild(dir);
  await demo.speed({ factor: 1 });
  await openWindow(page, { title: `Terminal — ${milestone} on wrangler dev, ${LOCAL}` });
  await demo.caption({
    value: 'Scenario T-1, on this machine',
    subtitle: "Outside Composer: the agent's Worker on wrangler dev",
  });
  await printLine(page, { text: "$ wrangler dev  # the agent's Worker, built here" });
  await printLine(page, { text: `Ready on ${LOCAL}` });
  await page.waitForTimeout(BEAT);
  await printLine(page, { text: '$ check scenario T-1' });
  const { id, passed, lines } = await checkT1();
  for (const line of lines) {
    await printLine(page, line);
    await page.waitForTimeout(line.ok === undefined ? 400 : 700);
  }
  await printLine(page, { text: passed ? 'T-1 passed' : 'T-1 FAILED', ok: passed });
  await page.waitForTimeout(BEAT * 3);
  if (newPage) {
    await openBrowser(page, { title: `${LOCAL}/  —  the new poll page`, url: `${LOCAL}/` });
    await demo.caption({
      value: 'The new poll page',
      subtitle:
        milestone === M1.id
          ? 'A title, a slot length and the slots, plainly'
          : 'A title and slot length, then the days and hours',
      hold: BEAT * 4,
    });
    await page.waitForTimeout(BEAT * 2);
    const title = inWindow('input:not([type]), input[type="text"]');
    if (await visible(page.locator(title), 5_000)) {
      await demo.click({ selector: `${title} >> nth=0`, label: 'Title' });
      await page.keyboard.type('Team offsite', { delay: 80 });
      await page.waitForTimeout(BEAT * 3);
    }
  }
  if (id) {
    await openBrowser(page, { title: `${LOCAL}/p/${id.slice(0, 12)}…  —  the T-1 poll`, url: `${LOCAL}/p/${id}` });
    await demo.caption({
      value: 'The T-1 poll, as Ben',
      subtitle: 'Ana and Chika have answered; Ben gives his name',
      hold: BEAT * 3,
    });
    await page.waitForTimeout(BEAT * 2);
    // The page asks a visitor's name first; the agent builds the form, so the first text field is the best guess.
    const name = page.locator(inWindow('input:not([type]), input[type="text"]')).first();
    if (await visible(name, 5_000)) {
      await demo.click({ selector: inWindow('input:not([type]), input[type="text"]') + ' >> nth=0', label: 'Name' });
      await page.keyboard.type('Ben', { delay: 60 });
      await page.keyboard.press('Enter');
      // A name field outside a form ignores Enter, so the page's button takes the click instead.
      await page.waitForTimeout(BEAT / 2);
      if (await name.isVisible().catch(() => false)) {
        await demo.click({ selector: `${inWindow('button')} >> nth=0`, label: 'Continue' });
      }
    }
    await page.waitForTimeout(BEAT);
    await poll(demo, page);
  }
  await closeWindow(page);
  if (!passed) {
    throw new Error(`T-1 failed against ${milestone}'s local build: ${JSON.stringify(lines)}`);
  }
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
    name: 'Show what the project builds',
    run: async ({ demo, page }) => {
      await openProjectTab(demo, page, 'overview');
      await demo.caption({
        value: 'A When2meet-style poll on Cloudflare Workers',
        subtitle: 'Respondents mark the hours they are free; the poll finds the best slot',
        hold: BEAT * 3,
      });
      await page
        .locator(`${ARTIFACTS} :text-is("${DESIGN_DOC}")`)
        .first()
        .waitFor({ state: 'visible', timeout: 15_000 });
      await demo.caption({ value: 'Design docs and diagrams come with the spec' });
      await page.locator(ARTIFACTS).first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Open a design doc',
    run: async ({ demo, page }) => {
      await demo.click({ selector: `${ARTIFACTS} :text-is("${DESIGN_DOC}") >> nth=0`, label: DESIGN_DOC });
      await demo.caption({
        value: 'Each poll is its own Durable Object',
        subtitle: "One writer per poll, so two saves can't lose each other's marks",
        hold: BEAT * 4,
      });
      await wheel(page, '[data-testid="deck.plank"] .cm-content', 4);
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Open the spec',
    run: async ({ demo, page }) => {
      await openProjectTab(demo, page, 'document');
      await demo.caption({ value: 'The spec, as the agent reads it', subtitle: 'Features, milestones and scenarios' });
      await scrollDocumentTo(page, M1.features[0], { exact: true });
      await demo.caption({
        value: 'Each feature lists its requirements',
        subtitle: 'F-1: a poll lives in a Durable Object of its own',
        hold: BEAT * 4,
      });
      // The milestones are a table, whose cells are not editor lines, so the scroll stops on the line above it.
      await scrollDocumentTo(page, 'The work ships in this order');
      await demo.caption({
        value: 'The spec stages the work as milestones',
        subtitle: 'This take builds M-1 and M-2',
        hold: BEAT * 4,
      });
      await scrollDocumentTo(page, 'scenario T-1: One zone');
      await demo.caption({
        value: 'Each milestone ends in a scenario',
        subtitle: 'T-1: three respondents, eight slots, one best slot',
        hold: BEAT * 4,
      });
      await wheel(page, DOCUMENT, 3, { delay: 600 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Open a feature',
    run: async ({ demo, page }) => {
      await openProjectTab(demo, page, 'features');
      await demo.caption({ value: 'Each feature is a block of the spec', subtitle: 'Planned, and no tasks yet' });
      await page.locator(node(HEATMAP)).waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT * 2);
      await openFeature(demo, page, HEATMAP);
      await demo.caption({
        value: 'A feature: its requirements and status',
        subtitle: 'The status moves as the work is checked',
        hold: BEAT * 4,
      });
      await closeCompanion(page);
    },
  },
  {
    name: 'Plan M-1 from the spec',
    done: async ({ page }) => tasksOf(await snapshot(page), M1.id).length >= 3,
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Ask the agent to plan the first milestone' });
      await ask(demo, page, planPrompt(M1.id));
      await demo.caption({
        value: 'The agent reads the spec and files the tasks',
        subtitle: `Sped up ${PLAN_SPEED}x`,
        position: 'top',
      });
      await waitFor(demo, page, planned(M1.id), 3, 'the M-1 plan', PLAN_SPEED);
      await page.waitForTimeout(BEAT * 2);
      await closeCompanion(page);
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
      await demo.caption({
        value: 'With its tasks done, M-1 is operational',
        subtitle: 'Three features checked, then deployed',
      });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Try M-1 locally',
    run: async ({ demo, page }) => {
      await tryLocally(demo, page, M1.id);
    },
  },
  {
    name: 'Read the M-1 review',
    run: async ({ demo, page }) => {
      await readReview(demo, page, M1);
    },
  },
  {
    name: 'Accept M-1',
    done: async ({ page }) => tasksOf(await snapshot(page), M1.id).every((task) => task.status === 'done'),
    run: async ({ demo, page }) => {
      await acceptMilestone(demo, page, M1.id, {
        value: 'Sign off the work',
        subtitle: 'Each delegated task waits in review for its person',
      });
      await demo.caption({ value: 'Signed off: every M-1 task done' });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Plan and delegate M-2',
    done: async ({ page }) => tasksOf(await snapshot(page), M2.id).some((task) => task.assigned),
    run: async ({ demo, page }) => {
      // Half an hour of agent work slows the page until M-2's agents time out, so M-2 starts on a fresh one.
      await demo.speed({ factor: FAST });
      await page.reload();
      await page.locator('[data-testid="deck.plank"]').first().waitFor({ state: 'visible', timeout: 300_000 });
      await page.waitForTimeout(BEAT * 4);
      await demo.speed({ factor: 1 });
      await demo.caption({ value: 'Next: lay out both pages' });
      await freshChat(page);
      await ask(demo, page, planPrompt(M2.id));
      await page.waitForTimeout(BEAT);
      await closeCompanion(page);
      await demo.caption({ value: 'The agent plans M-2', subtitle: 'Fast-forwarded', position: 'top' });
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
        value: 'Both pages laid out to the spec',
        subtitle: 'Checked against the scenario before it deploys',
        position: 'top',
      });
      await watchMilestone(demo, page, M2, 60);
      await demo.caption({
        value: 'With its tasks done, M-2 is operational',
        subtitle: 'Both pages checked, then deployed',
      });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Try M-2 locally',
    run: async ({ demo, page }) => {
      await tryLocally(demo, page, M2.id);
    },
  },
  {
    name: 'Read the M-2 review',
    run: async ({ demo, page }) => {
      await readReview(demo, page, M2, { features: [...M1.features, ...M2.features] });
    },
  },
  {
    name: 'Accept M-2',
    done: async ({ page }) => tasksOf(await snapshot(page), M2.id).every((task) => task.status === 'done'),
    run: async ({ demo, page }) => {
      await acceptMilestone(demo, page, M2.id, { value: 'Sign off M-2' });
      await demo.caption({ value: 'Signed off: every M-2 task done' });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Change the roster order',
    done: async ({ page }) =>
      (await snapshot(page)).features[POLL_PAGE]?.requirements.some(
        ({ id, text }) => id === ROSTER && text === NEW_ROSTER,
      ) ?? false,
    run: async ({ demo, page }) => {
      // As before M-2: the agents' work so far has slowed the page, and the revalidation runs on a fresh one.
      await demo.speed({ factor: FAST });
      await page.reload();
      await page.locator('[data-testid="deck.plank"]').first().waitFor({ state: 'visible', timeout: 300_000 });
      await page.waitForTimeout(BEAT * 4);
      await demo.speed({ factor: 1 });
      await demo.caption({
        value: 'Now change the spec',
        subtitle: `${ROSTER}: the roster lists the most marks first`,
        hold: BEAT * 3,
      });
      await openFeature(demo, page, POLL_PAGE);
      // Each requirement's text is an editor of its own, found by its current text.
      const editor = `${COMPANION} [data-testid^="requirement-editor."][data-testid$=".text"]:has-text("${ROSTER_PREFIX}") .cm-content`;
      if (!(await visible(page.locator(editor), 10_000))) {
        throw new Error(`no editor holds ${ROSTER} in the feature companion`);
      }
      await page.locator(editor).first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(BEAT * 2);
      await demo.click({ selector: `${editor} >> nth=0`, label: ROSTER });
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
      await page.keyboard.type(NEW_ROSTER, { delay: 20 });
      await page.waitForFunction(
        async ({ key, text }) => {
          const space = dxos
            .spaces()
            .find((candidate) => candidate.id === (globalThis[key] ??= sessionStorage.getItem(key) ?? undefined));
          const features = await space.db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.feature'))).run();
          return features.some((feature) =>
            Object.values(feature.requirements ?? {}).some((requirement) => requirement.text === text),
          );
        },
        { key: TAKE_SPACE, text: NEW_ROSTER },
        { timeout: 10_000 },
      );
      await demo.caption({ value: 'The requirement changes; the code does not, yet', hold: BEAT * 3 });
      await page.waitForTimeout(BEAT * 3);
    },
  },
  {
    name: 'Revalidate',
    done: async ({ page }) => {
      const state = await snapshot(page);
      return state.features[POLL_PAGE]?.status === 'failing' && state.tasks.some((task) => !task.assigned);
    },
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Ask the agent to verify it again' });
      await freshChat(page);
      await ask(demo, page, REVALIDATE_PROMPT);
      await page.waitForTimeout(BEAT);
      await closeCompanion(page);
      await openProjectTab(demo, page, 'features');
      await demo.caption({
        value: 'The agent reruns T-2 under the new requirement',
        subtitle: 'Fast-forwarded',
        position: 'top',
      });
      // Revalidating has taken 22 minutes, and the fix 40: each reruns T-2, and the fix rebuilds and redeploys.
      await waitFor(demo, page, (state) => state.features[POLL_PAGE]?.status === 'failing', 45, 'the revalidation');
      await demo.caption({
        value: 'The Worker no longer meets it: failing',
        subtitle: 'Its roster is still in the order people answered',
        hold: BEAT * 4,
      });
      await page.waitForTimeout(BEAT * 3);
      // The fix task is the one filed after the change, unassigned until it is delegated.
      await waitFor(demo, page, (state) => state.tasks.some((task) => !task.assigned), 15, 'the fix task');
    },
  },
  {
    name: 'Ship the fix',
    done: async ({ page }) => {
      const state = await snapshot(page);
      return (
        state.features[POLL_PAGE]?.status === 'operational' &&
        state.tasks.every((task) => FINISHED.includes(task.status))
      );
    },
    run: async ({ demo, page }) => {
      await openProjectTab(demo, page, 'tasks');
      await demo.caption({ value: 'The agent filed one task for the fix', hold: BEAT * 3 });
      await page.waitForTimeout(BEAT * 2);
      await demo.caption({ value: 'Hand the fix to the agent' });
      const fix = (await snapshot(page)).tasks.filter((task) => !task.assigned).map((task) => task.title);
      await delegate(demo, page, fix);
      await demo.caption({
        value: 'It changes the code, reruns T-2 and redeploys',
        subtitle: 'Fast-forwarded',
        position: 'top',
      });
      await showGantt(demo, page);
      await waitFor(
        demo,
        page,
        (state) =>
          state.features[POLL_PAGE]?.status === 'operational' &&
          state.tasks.filter((task) => fix.includes(task.title)).every((task) => FINISHED.includes(task.status)),
        60,
        'the fix',
      );
      await openProjectTab(demo, page, 'features');
      await demo.caption({ value: 'Verified again: Poll page is operational', hold: BEAT * 3 });
      await page.waitForTimeout(BEAT * 3);
      await acceptMilestone(demo, page, M2.id, { value: 'Sign off the fix' });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Try the fix locally',
    run: async ({ demo, page }) => {
      await tryLocally(demo, page, M2.id, {
        caption: 'Try the fix on this machine',
        newPage: false,
        poll: (demo, page) =>
          showRoster(demo, page, {
            value: 'The roster now leads with the most marks',
            subtitle: 'Ben marked 4 slots, so he comes before Ana and Chika',
          }),
      });
    },
  },
  {
    name: 'Hold on the spec',
    run: async ({ demo, page }) => {
      await openProjectTab(demo, page, 'document');
      await demo.caption({ value: 'The spec records the change', subtitle: `${ROSTER}, T-2 and the Changelog` });
      await scrollDocumentTo(page, POLL_PAGE, { exact: true, delay: 100 });
      await page.waitForTimeout(BEAT * 4);
      await scrollDocumentTo(page, 'Changelog', { delay: 100 });
      await demo.caption({
        value: 'M-1 and M-2 operational, the change verified',
        subtitle: 'Time zones and flight options are the next milestones',
        hold: BEAT * 4,
      });
      await page.waitForTimeout(BEAT * 4);
    },
  },
];
