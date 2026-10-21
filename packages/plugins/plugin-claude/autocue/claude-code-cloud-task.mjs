//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';

import { showPage } from './show-page.mjs';

/** The GitHub token: `DX_DEMO_GITHUB_TOKEN`, or the `GITHUB_TOKEN=` line of the `.secrets/` file `DX_DEMO_GITHUB_TOKEN_FILE` names. */
const githubToken = () =>
  process.env.DX_DEMO_GITHUB_TOKEN ??
  (process.env.DX_DEMO_GITHUB_TOKEN_FILE &&
    readFileSync(process.env.DX_DEMO_GITHUB_TOKEN_FILE, 'utf8')
      .match(/^GITHUB_TOKEN=(.+)$/m)?.[1]
      ?.trim());

/**
 * A project task delegated to Claude Code (cloud): the project names dxos/dxos as its repository, so the agent's EDGE
 * sandbox checks it out; the task asks for a pull request, which the agent opens with the space's GitHub token. The
 * flow shows the pull request, then closes it from the same chat.
 *
 * @mdl packages/plugins/plugin-claude/PLUGIN.mdl test QA-5
 * @app as `claude-code-cloud-pr.mjs`: a composer-app bundle against an EDGE that runs the coding agent, served on
 *   :4173, with `DX_DEMO_CLAUDE_TOKEN` and `DX_DEMO_GITHUB_TOKEN` in the driver's environment.
 */

const LINGER = 3_000;
const TURN_TIMEOUT = 15 * 60_000;

const REPOSITORY = 'dxos/dxos';
const PROJECT_TITLE = 'DXOS';
const BRANCH = `demo/claude-code-task-${Date.now()}`;
const TASK_TITLE = 'Add a contributor note for coding agents';
const TASK_DESCRIPTION = [
  `Add a file \`demo/coding-agents.md\` with a short note (two or three sentences) on how coding agents work on this repository.`,
  `Commit it on the branch \`${BRANCH}\`, push it, and open a draft pull request with \`gh pr create --draft\`.`,
  'Reply with the pull request URL.',
].join(' ');
const ASK_TO_CLOSE =
  'Thanks. Now close that pull request with `gh pr close --delete-branch`, and confirm when it is closed.';

const COMPANION = '[data-testid="deck.companion"]';
const PROMPT = `${COMPANION} [data-testid="assistant.prompt"] .cm-content`;
const THREAD = `${COMPANION} [data-testid="assistant.thread"]`;
const ACTIVITY = `${COMPANION} [data-testid="assistant.chat-activity"]`;
const ERROR = '[data-testid="assistant.error"]';
const PR_URL = new RegExp(`https://github\\.com/${REPOSITORY}/pull/\\d+`);

const github = (path) =>
  fetch(`https://api.github.com${path}`, {
    headers: { authorization: `Bearer ${githubToken()}`, accept: 'application/vnd.github+json' },
  });

const pullState = async (url) => {
  const response = await github(`/repos/${REPOSITORY}/pulls/${url.split('/').pop()}`);
  if (!response.ok) {
    throw new Error(`GitHub ${response.status} for ${url}: ${await response.text()}`);
  }
  return (await response.json()).state;
};

const spaceIdOf = (page) =>
  page.evaluate(() => document.querySelector('[data-testid="spacePlugin.space"]').dataset.value.split('/').pop());

/** Waits for the chat to show a pull request URL: a cold sandbox checks the repository out before the agent says anything. */
const waitForPullRequest = async (page) => {
  const deadline = Date.now() + TURN_TIMEOUT;
  while (Date.now() < deadline) {
    if ((await page.locator(ERROR).count()) > 0) {
      throw new Error(`the chat reported an error: ${await page.locator(ERROR).first().innerText()}`);
    }
    const url = (
      await page
        .locator(THREAD)
        .first()
        .innerText()
        .catch(() => '')
    ).match(PR_URL)?.[0];
    if (url) {
      return url;
    }
    await page.waitForTimeout(2_000);
  }
  throw new Error('no pull request URL in time');
};

/** Waits for the agent's turn to end: its activity line gone for a few checks in a row. Fails on an error toast. */
const waitForTurn = async (page) => {
  const deadline = Date.now() + TURN_TIMEOUT;
  await page
    .locator(ACTIVITY)
    .first()
    .waitFor({ timeout: 60_000 })
    .catch(() => {});
  let quiet = 0;
  while (Date.now() < deadline) {
    if ((await page.locator(ERROR).count()) > 0) {
      throw new Error(`the chat reported an error: ${await page.locator(ERROR).first().innerText()}`);
    }
    quiet = (await page.locator(ACTIVITY).count()) > 0 ? 0 : quiet + 1;
    if (quiet >= 5) {
      return;
    }
    await page.waitForTimeout(1_000);
  }
  throw new Error('the agent did not finish its turn in time');
};

/** Shows a GitHub page over the app, then lingers on the app. */
const visit = async ({ page }, url) => {
  await showPage(page, url, { hold: LINGER * 2, ready: url.split('/').pop() });
  await page.waitForTimeout(LINGER);
};

export const steps = [
  {
    name: 'Prep (off camera): enable Claude and add the tokens to the space',
    setup: true,
    run: async ({ demo, page }) => {
      if (!process.env.DX_DEMO_CLAUDE_TOKEN || !githubToken()) {
        throw new Error(
          'set DX_DEMO_CLAUDE_TOKEN and DX_DEMO_GITHUB_TOKEN (or DX_DEMO_GITHUB_TOKEN_FILE) in the driver environment',
        );
      }
      await page.locator('[data-testid="spacePlugin.createObject"]').first().waitFor({ timeout: 180_000 });
      const notice = page.locator('[data-testid="org.dxos.plugin.observability.notice"] button:has-text("Close")');
      if (await notice.isVisible().catch(() => false)) {
        await notice.click();
      }
      if (!(await page.evaluate(() => composer.manager.getEnabled().includes('org.dxos.plugin.claude')))) {
        await demo.click({ selector: '[data-testid="treeView.pluginRegistry"]', label: 'Plugins' });
        await demo.fill({ selector: 'input[placeholder="Filter…"]', value: 'Claude' });
        await demo.click({ selector: 'label.dx-switch:has(input[aria-label="Claude"])', label: 'Enable Claude' });
        await page.waitForFunction(() => composer.manager.getEnabled().includes('org.dxos.plugin.claude'));
        await demo.click({ selector: '[data-testid="spacePlugin.space"] >> nth=0', label: 'Space' });
      }
      await page.evaluate(
        async (tokens) => {
          const spaceId = document.querySelector('[data-testid="spacePlugin.space"]').dataset.value.split('/').pop();
          const existing = await dxos
            .spaces(spaceId)
            .db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.accessToken')))
            .run();
          for (const { source, token } of tokens) {
            if (!existing.some((accessToken) => accessToken.source === source && accessToken.token === token)) {
              await composer.invoke(
                'org.dxos.operation.space.addObject',
                { object: { '@type': 'org.dxos.type.accessToken', source, token } },
                { spaceId },
              );
            }
          }
        },
        [
          { source: 'claude.ai', token: process.env.DX_DEMO_CLAUDE_TOKEN },
          { source: 'github.com', token: githubToken() },
        ],
      );
      await demo.cut();
    },
  },
  {
    name: 'Create a project',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Create a project', subtitle: PROJECT_TITLE });
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({ selector: '[data-testid="create-object-form.type.org.dxos.type.project"]', label: 'Project' });
      await demo.type({
        selector: '[data-testid="create-project-panel.name-input"]',
        value: PROJECT_TITLE,
        label: 'Name',
      });
      await demo.click({ selector: '[role="dialog"] [data-testid="save-button"]', label: 'Save' });
      await page.getByTestId('projectsPlugin.tab.tasks').first().waitFor({ timeout: 30_000 });
      await page.waitForTimeout(LINGER);
    },
  },
  {
    name: 'Give the project the dxos/dxos repository',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: `Give the project its repository: ${REPOSITORY}`,
        subtitle: 'Its agents check it out in their sandbox',
      });
      // The Repo object stands for the GitHub repository; adding one has no UI of its own, so it is made here.
      const spaceId = await spaceIdOf(page);
      await page.evaluate(
        async ({ spaceId, repository }) => {
          const [owner, name] = repository.split('/');
          const repos = await dxos
            .spaces(spaceId)
            .db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.repo')))
            .run();
          if (!repos.some((repo) => repo.owner === owner && repo.name === name)) {
            await composer.invoke(
              'org.dxos.operation.space.addObject',
              {
                object: {
                  '@type': 'org.dxos.type.repo',
                  owner,
                  name,
                  'url': `https://github.com/${repository}`,
                  'defaultBranch': 'main',
                },
              },
              { spaceId },
            );
          }
        },
        { spaceId, repository: REPOSITORY },
      );
      await demo.click({ text: 'Checked out for coding agents that run in the cloud.', label: 'Repositories' });
      const option = `[data-scope="combobox"][role="option"]:has-text("${REPOSITORY.split('/')[1]}")`;
      await page.locator(option).first().waitFor({ timeout: 10_000 });
      await demo.click({ selector: option, label: REPOSITORY });
      await page.waitForTimeout(1_000);
      await demo.press({ key: 'Escape' });
      const attached = await page.evaluate(
        async ({ spaceId, title }) => {
          const projects = await dxos
            .spaces(spaceId)
            .db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.project')))
            .run();
          return (projects.findLast((project) => project.name === title)?.repositories ?? []).length;
        },
        { spaceId, title: PROJECT_TITLE },
      );
      if (attached !== 1) {
        throw new Error(`the project has ${attached} repositories, not 1`);
      }
      await page.waitForTimeout(LINGER);
    },
  },
  {
    name: 'Add a task',
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="projectsPlugin.tab.tasks"] >> nth=0', label: 'Tasks' });
      // The task editor sits at the bottom of the plank, under the caption banner.
      await demo.clearCaption();
      await demo.fill({ selector: '[data-testid="taskList.edit.title"] input', value: TASK_TITLE, label: 'Title' });
      await demo.fill({
        selector: '[data-testid="taskList.edit.description"] .cm-content',
        value: TASK_DESCRIPTION,
        label: 'Description',
      });
      await demo.click({ selector: '[data-testid="taskList.edit.save"]', label: 'Save' });
      await demo.caption({ value: 'Add a task', subtitle: TASK_TITLE });
      await page
        .locator(`[data-testid="taskList.item"]:has-text("${TASK_TITLE}")`)
        .first()
        .waitFor({ timeout: 10_000 });
      await page.waitForTimeout(LINGER);
    },
  },
  {
    name: 'Assign the task to Claude Code (cloud)',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Assign it to Claude Code (cloud)', subtitle: 'From the task’s menu' });
      const row = `[data-testid="taskList.item"]:has-text("${TASK_TITLE}")`;
      await demo.hover({ selector: row });
      await demo.click({ selector: `${row} >> [data-testid="taskList.item.actions"]`, label: 'Task actions' });
      await page.waitForTimeout(1_500);
      await demo.click({
        selector: '[role="menuitem"]:has-text("Assign to Claude Code (EDGE)")',
        label: 'Assign to Claude Code (EDGE)',
      });
      await page.waitForTimeout(LINGER);
    },
  },
  {
    name: 'Watch it open the pull request',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'It checks out dxos/dxos in an EDGE sandbox and opens a pull request',
        subtitle: BRANCH,
      });
      const tab = page.locator(`${COMPANION} >> role=tab[name="Assistant"]`).first();
      if ((await tab.count()) && (await tab.getAttribute('aria-selected')) !== 'true') {
        await demo.click({ selector: `${COMPANION} >> role=tab[name="Assistant"]`, label: 'Assistant' });
      }
      await page.locator(THREAD).first().waitFor({ timeout: 60_000 });
      const url = await waitForPullRequest(page);
      await waitForTurn(page);
      if ((await pullState(url)) !== 'open') {
        throw new Error(`${url} is not open`);
      }
      globalThis.autocuePullRequest = url;
      await page.waitForTimeout(LINGER);
    },
  },
  {
    name: 'Show the pull request on GitHub',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'The draft pull request', subtitle: globalThis.autocuePullRequest });
      await visit({ demo, page }, globalThis.autocuePullRequest);
    },
  },
  {
    name: 'Ask it to close the pull request',
    run: async ({ demo, page }) => {
      const tab = page.locator(`${COMPANION} >> role=tab[name="Assistant"]`).first();
      if ((await tab.count()) && (await tab.getAttribute('aria-selected')) !== 'true') {
        await demo.click({ selector: `${COMPANION} >> role=tab[name="Assistant"]`, label: 'Assistant' });
      }
      // The caption banner sits over the prompt and would take the click.
      await demo.clearCaption();
      await demo.click({ selector: PROMPT, label: 'Prompt' });
      await demo.fill({ selector: PROMPT, value: ASK_TO_CLOSE, label: 'Prompt' });
      await page.waitForTimeout(1_000);
      await demo.press({ key: 'Enter' });
      await demo.caption({ value: 'Ask it to close the pull request', subtitle: 'In the project’s chat' });
      await waitForTurn(page);
      for (let attempt = 0; (await pullState(globalThis.autocuePullRequest)) !== 'closed'; attempt++) {
        if (attempt >= 30) {
          throw new Error(`${globalThis.autocuePullRequest} is still open`);
        }
        await page.waitForTimeout(2_000);
      }
    },
  },
  {
    name: 'Show the closed pull request',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Closed, and its branch deleted', subtitle: globalThis.autocuePullRequest });
      await visit({ demo, page }, globalThis.autocuePullRequest);
    },
  },
];
