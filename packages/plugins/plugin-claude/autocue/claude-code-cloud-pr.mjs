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
 * A standalone chat on Claude Code (cloud): the agent runs in an EDGE sandbox on the space's Claude subscription
 * token, clones dxos/dxos with the space's GitHub token, opens a draft pull request, and closes it when asked.
 *
 * @mdl packages/plugins/plugin-claude/PLUGIN.mdl test QA-4
 * @app composer-app bundle against an EDGE that runs the coding agent, served on :4173 from localhost (EDGE waives
 *   the account check for a localhost origin):
 *
 *   DX_EDGE_BASE_URL=https://preview.dxos.network DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true \
 *     moon run composer-app:bundle
 *   (cd packages/apps/composer-app && npx vite preview --port 4173)
 *   DX_DEMO_CLAUDE_TOKEN=... DX_DEMO_GITHUB_TOKEN=... node .agents/skills/autocue/scripts/driver.mjs \
 *     --url http://localhost:4173 --out /tmp/demo
 *
 * `DX_DEMO_CLAUDE_TOKEN` is a `claude setup-token` token; `DX_DEMO_GITHUB_TOKEN` must be able to push to dxos/dxos.
 * Both are added to the space off camera, as a connection would add them.
 */

/** A beat for the viewer to take in a result. */
const LINGER = 3_000;

/** One agent turn: cloning dxos/dxos and opening a pull request takes a few minutes. */
const TURN_TIMEOUT = 15 * 60_000;

const REPOSITORY = 'dxos/dxos';
const BRANCH = `demo/claude-code-cloud-${Date.now()}`;
const PR_TITLE = '[demo] Claude Code (cloud) opens a pull request';

const ASK_FOR_PR = [
  `Clone https://github.com/${REPOSITORY} (a shallow clone is fine) and create the branch \`${BRANCH}\`.`,
  'Add a file `demo/claude-code-cloud.md` with one line saying it was written by Claude Code running in an EDGE sandbox,',
  `commit it, push the branch, and open a draft pull request titled "${PR_TITLE}" with \`gh pr create --draft\`.`,
  'Reply with the pull request URL.',
].join(' ');
const ASK_TO_CLOSE = 'Now close that pull request with `gh pr close --delete-branch`, and confirm when it is closed.';

const PLANK = '[data-testid="deck.plank"]:has([data-testid="assistant.thread"])';
const PROMPT = `${PLANK} [data-testid="assistant.prompt"] .cm-content`;
const THREAD = `${PLANK} [data-testid="assistant.thread"]`;
const ACTIVITY = `${PLANK} [data-testid="assistant.chat-activity"]`;
const ERROR = '[data-testid="assistant.error"]';
const PR_URL = new RegExp(`https://github\\.com/${REPOSITORY}/pull/\\d+`);

const github = (path, init = {}) =>
  fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${githubToken()}`,
      accept: 'application/vnd.github+json',
      ...init.headers,
    },
  });

/** The pull request's state on GitHub: `open` or `closed`. */
const pullState = async (url) => {
  const number = url.split('/').pop();
  const response = await github(`/repos/${REPOSITORY}/pulls/${number}`);
  if (!response.ok) {
    throw new Error(`GitHub ${response.status} for ${url}: ${await response.text()}`);
  }
  return (await response.json()).state;
};

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

/** Sends a prompt to the chat. */
const send = async ({ demo, page }, text, caption) => {
  // The caption banner sits over the prompt and would take the click.
  await demo.clearCaption();
  await demo.click({ selector: PROMPT, label: 'Prompt' });
  await demo.fill({ selector: PROMPT, value: text, label: 'Prompt' });
  await page.waitForTimeout(1_000);
  await demo.press({ key: 'Enter' });
  await demo.caption(caption);
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
        await demo.fill({ selector: 'input[placeholder="Filter..."]', value: 'Claude' });
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
    name: 'Create a chat',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Create a chat',
        subtitle: 'The space holds a Claude subscription token and a GitHub token',
      });
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({
        selector: '[data-testid="create-object-form.type.org.dxos.type.assistant.chat"]',
        label: 'Chat',
      });
      await page.locator(PROMPT).first().waitFor({ timeout: 30_000 });
      await page.waitForTimeout(LINGER);
    },
  },
  {
    name: 'Run the chat on Claude Code (cloud)',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Run it on Claude Code (cloud)',
        subtitle: 'An EDGE sandbox, on your Claude subscription',
      });
      const picker = `${PLANK} [data-testid="assistant.agent-picker"]`;
      await demo.click({ selector: picker, label: 'Agent' });
      await demo.click({ selector: '[data-testid="assistant.agents.claude-code"]', label: 'Claude Code' });
      await demo.click({ selector: picker, label: 'Agent' });
      await demo.click({ selector: '[data-testid="assistant.environment.edge"]', label: 'EDGE' });
      await page.locator(`${picker}[data-location="edge"]:has-text("Claude Code")`).waitFor();
      await page.waitForTimeout(LINGER);
    },
  },
  {
    name: 'Ask it to clone dxos/dxos and open a pull request',
    run: async ({ demo, page }) => {
      await send({ demo, page }, ASK_FOR_PR, {
        value: 'Ask it to clone dxos/dxos and open a pull request',
        subtitle: BRANCH,
      });
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
      await demo.caption({
        value: 'The draft pull request, opened from the sandbox',
        subtitle: globalThis.autocuePullRequest,
      });
      await visit({ demo, page }, globalThis.autocuePullRequest);
    },
  },
  {
    name: 'Ask it to close the pull request',
    run: async ({ demo, page }) => {
      await send({ demo, page }, ASK_TO_CLOSE, {
        value: 'Ask it to close the pull request',
        subtitle: 'Same session, same sandbox',
      });
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
