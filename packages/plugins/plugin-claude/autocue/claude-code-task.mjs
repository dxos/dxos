//
// Copyright 2026 DXOS.org
//

import { execFileSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Assign a project task to Claude Code on this computer and drive it from Composer: Claude works in a git
 * worktree of the project's repository, streams its session into the chat, marks the task through Composer's MCP
 * tools, and commits when asked in a follow-up.
 *
 * @mdl packages/plugins/plugin-claude/PLUGIN.mdl test QA-2, and test QA-3 with `AUTOCUE_AGENT_PERMISSIONS=default`
 * @app composer-app desktop test build, driven by `driver.mjs --target tauri`; `claude` installed and signed in
 *
 *   DX_TAURI=true DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:tauri-build-test
 *   node .agents/skills/autocue/scripts/driver.mjs --target tauri --fresh on --out /tmp/demo
 *
 * Coding agents start in `auto`, where Claude asks only before a risky action. Set `AUTOCUE_AGENT_PERMISSIONS` in
 * the driver's environment to another mode (`default` asks before every edit and command) and the take opens by
 * choosing it in the Code plugin's settings.
 *
 * The native folder picker cannot be driven, so the flow writes the demo repository where the picker's choice goes.
 * Step 1 rebuilds that repository, so every take starts from the same commit; `--fresh on` clears the worktrees
 * earlier takes left in the test build's data folder.
 */

/** A beat for the viewer to take in a result. */
const LINGER = 2_500;

/** Claude's turns: long enough for a slow model, short enough that a stuck turn fails the step. */
const TURN_TIMEOUT = 5 * 60_000;

const PERMISSIONS = process.env.AUTOCUE_AGENT_PERMISSIONS ?? 'auto';

/** What Claude asks before in each mode that asks more than `auto`. */
const ASKS = { acceptEdits: 'before every command', default: 'before every edit and command' };

const DEMO_DIR = join(tmpdir(), 'autocue-claude-code');
const REPOSITORY = join(DEMO_DIR, 'greeter');

const PROJECT_TITLE = 'Greeter';
const TASK_TITLE = 'Add a --shout flag to greet.js';
const TASK_DESCRIPTION = 'With --shout, print the greeting in capitals. Document the flag in the README.';
const FOLLOW_UP = 'Also accept -s as a short form of --shout, then commit.';

const SPACE = '[data-testid="spacePlugin.space"] >> nth=0';
const PROMPT = '[data-testid="deck.companion"] [data-testid="assistant.prompt"] .cm-content';
const REQUEST = '[data-testid="assistant.request"]:has([data-action="respond"])';
const ACTIVITY = '[data-testid="deck.companion"] [data-testid="assistant.chat-activity"]';

const git = (...args) => execFileSync('git', args, { cwd: REPOSITORY, encoding: 'utf8' }).trim();

/** The demo repository: a two-file Node CLI on `main`, one commit. */
const seedRepository = async () => {
  await rm(DEMO_DIR, { recursive: true, force: true });
  await mkdir(REPOSITORY, { recursive: true });
  await writeFile(
    join(REPOSITORY, 'greet.js'),
    "#!/usr/bin/env node\n// Prints a greeting: `node greet.js [name]`.\n\nconst name = process.argv[2] ?? 'world';\nconsole.log(`Hello, ${name}!`);\n",
  );
  await writeFile(
    join(REPOSITORY, 'README.md'),
    '# greeter\n\nA tiny command-line greeter.\n\n```\nnode greet.js Ada\n```\n',
  );
  git('init', '-q', '-b', 'main');
  git('add', '-A');
  git('-c', 'user.name=Demo', '-c', 'user.email=demo@example.com', 'commit', '-qm', 'Initial greeter');
};

/** The id and status of every task titled {@link TASK_TITLE} in the first space. */
const demoTasks = (page) =>
  page.evaluate(async (title) => {
    const spaceId = document.querySelector('[data-testid="spacePlugin.space"]').dataset.value.split('/').pop();
    const tasks = await dxos
      .spaces(spaceId)
      .db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.task')))
      .run();
    return tasks.filter((task) => task.title === title).map(({ id, status }) => ({ id, status }));
  }, TASK_TITLE);

/** The status of the task this take added, by id: a replay in the same profile can leave one of the same title. */
const taskStatus = async (page) => (await demoTasks(page)).find(({ id }) => id === globalThis.autocueTaskId)?.status;

/**
 * Waits for Claude's turn to end, allowing each request it makes on the way: "Yes" (this once) where offered,
 * rather than an option that changes how later requests are handled. Returns how many requests it answered.
 */
const answerUntilIdle = async ({ demo, page }) => {
  const deadline = Date.now() + TURN_TIMEOUT;
  let answered = 0;
  let quiet = 0;
  while (Date.now() < deadline) {
    if ((await page.locator(REQUEST).count()) > 0) {
      await page
        .locator(REQUEST)
        .first()
        .scrollIntoViewIfNeeded()
        .catch(() => {});
      await page.waitForTimeout(LINGER);
      // A card can close between the look and the click (its turn moved on); the next pass looks again.
      const clicked = await demo
        .click({
          selector: (await page.locator(`${REQUEST} >> nth=0 >> [data-action="respond"]:text-is("Yes")`).count())
            ? `${REQUEST} >> nth=0 >> [data-action="respond"]:text-is("Yes")`
            : `${REQUEST} >> nth=0 >> [data-action="respond"] >> nth=0`,
          label: 'Allow',
        })
        .then(
          () => true,
          () => false,
        );
      answered += clicked ? 1 : 0;
      quiet = 0;
      continue;
    }
    // Idle once the activity line has been gone for a few checks in a row.
    quiet = (await page.locator(ACTIVITY).count()) > 0 ? 0 : quiet + 1;
    if (quiet >= 4) {
      return answered;
    }
    await page.waitForTimeout(1_000);
  }
  throw new Error('Claude did not finish its turn in time');
};

/** Opens Plugins, filtered to `name`. On a fresh profile the first click can land while the navtree settles. */
const openPlugins = async ({ demo, page }, name) => {
  const filter = page.locator('input[placeholder="Filter…"]').first();
  for (let attempt = 0; attempt < 3 && !(await filter.isVisible()); attempt++) {
    await demo.click({ selector: '[data-testid="treeView.pluginRegistry"]', label: 'Plugins' });
    await filter.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
  }
  await demo.fill({ selector: 'input[placeholder="Filter…"]', value: '', hud: false });
  await demo.type({ selector: 'input[placeholder="Filter…"]', value: name, label: 'Filter' });
  await page.waitForTimeout(LINGER);
};

export const steps = [
  {
    name: 'Prep (off camera): seed the repository',
    setup: true,
    run: async ({ demo, page }) => {
      await seedRepository();
      await page.locator('[data-testid="deck.plank"]').first().waitFor({ timeout: 180_000 });
      const notice = page.locator('[data-testid="org.dxos.plugin.observability.notice"] button:has-text("Close")');
      if (
        await notice.waitFor({ state: 'visible', timeout: 8_000 }).then(
          () => true,
          () => false,
        )
      ) {
        await notice.click();
      }
      // The take starts here: the boot above is not part of it.
      await demo.cut();
    },
  },
  {
    name: 'Enable the Claude plugin',
    done: ({ page }) =>
      page.evaluate(() =>
        composer.plugins().some((plugin) => plugin.id === 'org.dxos.plugin.claude' && plugin.enabled),
      ),
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Enable the Claude plugin', subtitle: 'Plugins → Claude' });
      await openPlugins({ demo, page }, 'Claude');
      await demo.click({ selector: 'input[id="org.dxos.plugin.claude-input"]', label: 'Enable Claude' });
      await page.locator('input[id="org.dxos.plugin.claude-input"]:checked').waitFor();
      await page.waitForTimeout(LINGER);
    },
  },
  ...(PERMISSIONS === 'auto'
    ? []
    : [
        {
          name: `Set coding agents to ${PERMISSIONS} permissions`,
          done: ({ page }) =>
            page.evaluate((mode) => {
              const { manager } = composer;
              const [settings] = manager.capabilities.getAll({
                identifier: 'org.dxos.plugin.code.capability.settings',
              });
              return manager.registry.get(settings).agentPermissionMode === mode;
            }, PERMISSIONS),
          run: async ({ demo, page }) => {
            await demo.caption({
              value: `Have Claude ask ${ASKS[PERMISSIONS]}`,
              subtitle: `Code settings → Coding agent permissions → ${PERMISSIONS}`,
            });
            await openPlugins({ demo, page }, 'Code');
            await demo.click({ selector: '[data-testid="pluginList.org.dxos.plugin.code"] button', label: 'Settings' });
            const select = '[data-testid="deck.plank"] [role="combobox"]';
            await page.locator(select).first().waitFor({ timeout: 10_000 });
            await page.waitForTimeout(LINGER);
            await demo.click({ selector: select, label: 'Coding agent permissions' });
            await demo.click({ selector: `[role="option"][data-value="${PERMISSIONS}"]`, label: PERMISSIONS });
            await page.locator(`${select}:has-text("${PERMISSIONS}")`).waitFor();
            await page.waitForTimeout(LINGER);
          },
        },
      ]),
  {
    name: 'Create a project',
    done: async ({ page }) =>
      (await page.locator(`[data-testid="deck.plank"]:has-text("${PROJECT_TITLE}")`).count()) > 0,
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Create a project', subtitle: PROJECT_TITLE });
      // The space's tab toggles the sidebar, so it is clicked only until the space's navtree is on screen, judged by
      // its add button sitting in the sidebar: collapsed, the button moves to the rail's corner and the tree is laid
      // out off to the left, where it still counts as visible.
      const navtreeShown = async () =>
        ((
          await page
            .locator('[data-testid="spacePlugin.createObject"]')
            .first()
            .boundingBox()
            .catch(() => null)
        )?.x ?? 0) > 100;
      for (let attempt = 0; attempt < 3 && !(await navtreeShown()); attempt++) {
        await demo.click({ selector: SPACE, label: 'My Space' });
        await page.waitForTimeout(1_000);
      }
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({ selector: '[data-testid="create-object-form.type.org.dxos.type.project"]', label: 'Project' });
      await demo.type({
        selector: '[data-testid="create-project-panel.name-input"]',
        value: PROJECT_TITLE,
        label: 'Name',
      });
      await demo.click({ selector: '[role="dialog"] [data-testid="save-button"]', label: 'Save' });
      await page.getByTestId('projectsPlugin.tab.tasks').first().waitFor({ timeout: 30_000 });
    },
  },
  {
    name: "Choose the project's code folder on this computer",
    run: async ({ demo, page }) => {
      await demo.caption({
        value: "Choose the project's code folder",
        subtitle: 'Kept on this device only; each delegated task gets its own git worktree of it',
      });
      // Stands in for the native picker, which nothing can drive: its choice goes where the picker's would, the
      // plugin's local state.
      await demo.hover({ selector: 'button:has-text("Choose folder")' });
      await page.evaluate(
        async ({ title, folder }) => {
          const spaceId = document.querySelector('[data-testid="spacePlugin.space"]').dataset.value.split('/').pop();
          const projects = await dxos
            .spaces(spaceId)
            .db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.project')))
            .run();
          const project = projects.findLast((project) => project.name === title);
          const { manager } = composer;
          const [state] = manager.capabilities.getAll({ identifier: 'org.dxos.plugin.code.capability.state' });
          manager.registry.update(state, ({ repositories = {}, ...rest }) => ({
            ...rest,
            repositories: { ...repositories, [project.id]: folder },
          }));
        },
        { title: PROJECT_TITLE, folder: REPOSITORY },
      );
      await page.locator('[data-testid="deck.plank"]').getByText(REPOSITORY).first().waitFor();
      await page.waitForTimeout(LINGER);
    },
  },
  {
    name: 'Add a task',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Add a task', subtitle: TASK_TITLE });
      await demo.click({ selector: '[data-testid="projectsPlugin.tab.tasks"] >> nth=0', label: 'Tasks' });
      // Filled rather than typed: a description typed key by key outlasts a gesture's timeout.
      await demo.fill({ selector: '[data-testid="taskList.edit.title"]', value: TASK_TITLE, label: 'Title' });
      await demo.fill({
        selector: '[data-testid="taskList.edit.description"] .cm-content',
        value: TASK_DESCRIPTION,
        label: 'Description',
      });
      globalThis.autocueTaskId = undefined;
      const before = new Set((await demoTasks(page)).map(({ id }) => id));
      await demo.click({ selector: '[data-testid="taskList.edit.save"]', label: 'Save' });
      for (let attempt = 0; attempt < 20 && globalThis.autocueTaskId === undefined; attempt++) {
        globalThis.autocueTaskId = (await demoTasks(page)).find(({ id }) => !before.has(id))?.id;
        await page.waitForTimeout(500);
      }
      if (globalThis.autocueTaskId === undefined) {
        throw new Error('the task was not added');
      }
    },
  },
  {
    name: 'Assign the task to Claude Code',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Assign the task to Claude Code', subtitle: 'From the task’s menu' });
      const row = `[data-testid="taskList.item"]:has-text("${TASK_TITLE}")`;
      await demo.hover({ selector: row });
      await demo.click({ selector: `${row} >> [data-testid="taskList.item.actions"]`, label: 'Task actions' });
      await page.waitForTimeout(LINGER);
      await demo.click({ text: 'Assign to Claude Code', label: 'Assign to Claude Code' });
      for (let attempt = 0; (await taskStatus(page)) !== 'started'; attempt++) {
        if (attempt >= 30) {
          throw new Error('the task did not start');
        }
        await page.waitForTimeout(1_000);
      }
    },
  },
  {
    name: 'Watch Claude work, allowing what it asks to run',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Claude Code works in its own worktree',
        subtitle:
          PERMISSIONS === 'auto'
            ? 'Its session streams into the chat; it asks here only before a risky action'
            : 'Its session streams into the chat; each edit and command waits for an answer here',
      });
      const tab = page.locator('[data-testid="deck.companion"] >> role=tab[name="Assistant"]').first();
      if ((await tab.getAttribute('aria-selected')) !== 'true') {
        await demo.click({
          selector: '[data-testid="deck.companion"] >> role=tab[name="Assistant"]',
          label: 'Assistant',
        });
      }
      await answerUntilIdle({ demo, page });
      const status = await taskStatus(page);
      if (status !== 'done' && status !== 'review') {
        throw new Error(`the task is ${status}, not finished`);
      }
      await page.waitForTimeout(LINGER);
    },
  },
  {
    name: 'Ask for more in a follow-up',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Ask for more in a follow-up', subtitle: 'The same Claude Code session continues' });
      await demo.click({ selector: PROMPT, label: 'Prompt' });
      // Filled rather than typed: typed key by key, the prompt outlasts a gesture's timeout.
      await demo.fill({ selector: PROMPT, value: FOLLOW_UP, label: 'Prompt' });
      await demo.press({ key: 'Enter' });
      await page.locator(ACTIVITY).first().waitFor({ timeout: 30_000 });
      await answerUntilIdle({ demo, page });
      const branch = git('for-each-ref', '--format=%(refname:short)', 'refs/heads/composer/');
      const log = branch ? git('log', '--oneline', `main..${branch}`) : '';
      // Judged by behaviour, in the worktree Claude committed from: `-s` shouts, and nothing is left uncommitted.
      const worktree = git('worktree', 'list', '--porcelain')
        .split('\n\n')
        .find((entry) => entry.includes(`branch refs/heads/${branch}`))
        ?.match(/^worktree (.+)$/m)?.[1];
      const shouted =
        worktree && execFileSync('node', ['greet.js', 'Ada', '-s'], { cwd: worktree, encoding: 'utf8' }).trim();
      const clean =
        worktree && execFileSync('git', ['status', '--porcelain'], { cwd: worktree, encoding: 'utf8' }) === '';
      if (!branch || shouted !== 'HELLO, ADA!' || !clean) {
        throw new Error(`the follow-up is not committed on a composer/ branch (${branch}: ${shouted}, clean ${clean})`);
      }
      await demo.caption({ value: `Committed on ${branch}`, subtitle: log.split('\n').join(' · ') });
      await page.waitForTimeout(LINGER * 2);
    },
  },
];
